/**
 * Read a required environment variable. Throws at startup if missing.
 */
export function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

/**
 * Read an optional environment variable. Returns undefined if not set.
 */
export function optionalEnv(name: string): string | undefined {
  return process.env[name] || undefined
}
