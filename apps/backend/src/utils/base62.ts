import { customAlphabet } from 'nanoid'

const BASE62_CHARSET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
const generateShortCodeNano = customAlphabet(BASE62_CHARSET, 7)

/**
 * Generates a random Base62 short code (7 characters long).
 * Example: 'a9X2kL7'
 */
export function generateShortCode(length: number = 7): string {
  if (length === 7) {
    return generateShortCodeNano()
  }
  return customAlphabet(BASE62_CHARSET, length)()
}

