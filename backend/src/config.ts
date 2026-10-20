/**
 * Central server-side configuration and environment helpers.
 */

/**
 * Returns true if permanent deletion of leads and schools is enabled.
 * Enabled ONLY when ALLOW_DELETE is the string "true" (case-insensitive, trimmed).
 * Missing, empty, or any other value defaults to false (disabled).
 */
export function isDeleteEnabled(): boolean {
  const val = process.env['ALLOW_DELETE']
  if (!val) return false
  return val.trim().toLowerCase() === 'true'
}
