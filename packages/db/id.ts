import { customAlphabet } from 'nanoid';

// Standard 24-character alphanumeric nanoid generator
const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 24);

export type IdPrefix = 'org' | 'usr' | 'lnk' | 'srt' | 'pxl' | 'evt' | 'key';

/**
 * Generates a Stripe-style prefixed ID (e.g. `lnk_2k9x8a7b6c5d4e3f2g1h0i9j`).
 */
export function generateId(prefix: IdPrefix): string {
  return `${prefix}_${nanoid()}`;
}

/**
 * Validates whether a given ID string matches the expected Stripe-style prefix.
 */
export function validateId(id: string, expectedPrefix: IdPrefix): boolean {
  if (!id || typeof id !== 'string') return false;
  const parts = id.split('_');
  return parts.length === 2 && parts[0] === expectedPrefix && parts[1].length === 24;
}

