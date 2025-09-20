export function getRequiredEnv(name: string): string {
  const value = process.env[name]
  if (typeof value === 'string' && value.length > 0) {
    return value
  }

  throw new Error(`Environment variable ${name} is not set`)
}
