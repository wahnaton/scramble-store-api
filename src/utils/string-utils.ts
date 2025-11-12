export const slugify = (s?: string): string =>
  (s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

// Minimal identity normalization: trim, collapse spaces, lowercase
export const normalizeIdentity = (s?: string): string => (s || '').trim().replace(/\s+/g, ' ').toLowerCase()

export const isHexColor = (s?: string): boolean => /^#[0-9A-Fa-f]{6}$/.test(s || '')
