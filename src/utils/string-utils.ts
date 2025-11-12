export const slugify = (s?: string): string =>
  (s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

// Sanitize string: trim, collapse spaces, lowercase
export const sanitizeString = (s?: string): string =>
  (s || '').trim().replace(/\s+/g, ' ').toLowerCase()

export const isHexColor = (s?: string): boolean => /^#[0-9A-Fa-f]{6}$/.test(s || '')
