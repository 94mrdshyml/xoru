// WebCrypto-based password hashing and verification for edge execution

export function generateSalt(length = 16): string {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder()
  const combined = enc.encode(`${salt}:${password}`)
  const hashBuffer = await crypto.subtle.digest('SHA-256', combined)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function verifyPassword(password: string, salt: string, expectedHash: string): Promise<boolean> {
  const actualHash = await hashPassword(password, salt)
  // Constant-time comparison
  if (actualHash.length !== expectedHash.length) return false
  let match = 0
  for (let i = 0; i < actualHash.length; i++) {
    match |= actualHash.charCodeAt(i) ^ expectedHash.charCodeAt(i)
  }
  return match === 0
}

