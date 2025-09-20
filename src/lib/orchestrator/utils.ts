export function createRandomId(prefix: string): string {
  const uuid =
    typeof globalThis !== 'undefined' &&
    typeof globalThis.crypto !== 'undefined' &&
    'randomUUID' in globalThis.crypto
      ? globalThis.crypto.randomUUID()
      : Math.random().toString(36).slice(2, 10)

  return `${prefix}_${uuid}`
}
