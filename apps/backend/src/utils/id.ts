import { customAlphabet } from 'nanoid'

const alphabet = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
const generateNanoId = customAlphabet(alphabet, 24)

export type IDPrefix = 'org' | 'wrk' | 'lnk' | 'usr' | 'srt' | 'pxl' | 'evt' | 'key'

/**
 * Generates a Stripe-style prefixed ID.
 * Example: generateId('org') -> 'org_7x89q2m10v8z4p3n5k6w7y8z'
 */
export function generateId(prefix: IDPrefix): string {
  return `${prefix}_${generateNanoId()}`
}

