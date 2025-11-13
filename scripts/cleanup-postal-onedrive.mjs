import { config as loadEnv } from 'dotenv';

loadEnv({ path: '.env.local', override: true });
loadEnv();

const REQUIRED_ENV = [
  'AZURE_TENANT_ID',
  'AZURE_CLIENT_ID',
  'AZURE_CLIENT_SECRET',
  'POSTAL_ONEDRIVE_DRIVE_ID',
  'POSTAL_ONEDRIVE_FOLDER_ID',
  'POSTAL_ONEDRIVE_PENDING_FOLDER_ID',
  'POSTAL_ONEDRIVE_ARCHIVE_FOLDER_ID'
];

for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    throw new Error(`Missing required env var ${key}`);
  }
}

const tenantId = process.env.AZURE_TENANT_ID;
const clientId = process.env.AZURE_CLIENT_ID;
const clientSecret = process.env.AZURE_CLIENT_SECRET;
const driveId = process.env.POSTAL_ONEDRIVE_DRIVE_ID;
const folders = {
  source: process.env.POSTAL_ONEDRIVE_FOLDER_ID,
  pending: process.env.POSTAL_ONEDRIVE_PENDING_FOLDER_ID,
  archive: process.env.POSTAL_ONEDRIVE_ARCHIVE_FOLDER_ID
};

const dryRun = process.argv.includes('--dry-run');

async function getAccessToken() {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials'
  });

  const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to acquire Graph token (${res.status}): ${text}`);
  }

  const json = await res.json();
  return json.access_token;
}

async function graphGet(token, url) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Graph request failed (${res.status}): ${text}`);
  }

  return res.json();
}

async function listFolderItems(token, folderId, label) {
  const items = [];
  let url = `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${folderId}/children?$select=id,name,size,webUrl`;

  while (url) {
    const data = await graphGet(token, url);
    for (const entry of data.value ?? []) {
      if (!entry.id || !entry.name) continue;
      items.push({
        id: entry.id,
        name: entry.name,
        size: entry.size,
        webUrl: entry.webUrl
      });
    }
    url = data['@odata.nextLink'] ?? '';
  }

  console.log(`Fetched ${items.length} items from ${label} folder`);
  return items;
}

function buildKey(item) {
  const name = item.name.trim().toLowerCase();
  const size = item.size ?? 0;
  return `${name}::${size}`;
}

async function deleteFile(token, item, folder) {
  const res = await fetch(`https://graph.microsoft.com/v1.0/drives/${driveId}/items/${item.id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (res.status === 204) {
    console.log(`Deleted ${folder} file "${item.name}" (${item.id})`);
    return true;
  }

  const text = await res.text();
  console.warn(
    `Failed to delete ${folder} file "${item.name}" (${item.id}): ${res.status} ${text}`
  );
  return false;
}

async function main() {
  const token = await getAccessToken();

  const [sourceItems, pendingItems, archiveItems] = await Promise.all([
    listFolderItems(token, folders.source, 'source'),
    listFolderItems(token, folders.pending, 'pending'),
    listFolderItems(token, folders.archive, 'archive')
  ]);

  const archiveMap = new Map();
  for (const item of archiveItems) {
    const key = buildKey(item);
    const existing = archiveMap.get(key) ?? [];
    existing.push(item);
    archiveMap.set(key, existing);
  }

  const toDelete = [];
  for (const item of sourceItems) {
    if (archiveMap.has(buildKey(item))) {
      toDelete.push({ folder: 'source', item });
    }
  }
  for (const item of pendingItems) {
    if (archiveMap.has(buildKey(item))) {
      toDelete.push({ folder: 'pending', item });
    }
  }

  if (!toDelete.length) {
    console.log('No duplicates found. Nothing to delete.');
    return;
  }

  console.log(
    `Identified ${toDelete.length} files present in source/pending that also exist in archive.`
  );

  if (dryRun) {
    console.log('Dry run enabled. Files that would be deleted:');
    for (const entry of toDelete) {
      console.log(` - [${entry.folder}] ${entry.item.name} (id=${entry.item.id})`);
    }
    return;
  }

  let deleted = 0;
  for (const entry of toDelete) {
    const success = await deleteFile(token, entry.item, entry.folder);
    if (success) deleted += 1;
  }

  console.log(`Finished cleanup. Deleted ${deleted}/${toDelete.length} duplicate files.`);
}

main().catch((err) => {
  console.error('Postal OneDrive cleanup failed:', err);
  process.exit(1);
});
