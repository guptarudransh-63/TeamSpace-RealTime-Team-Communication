/**
 * Text sanitization and mention extraction utilities
 */

export const sanitizeText = (text) => {
  if (typeof text !== 'string') return '';
  // Basic HTML entity escape to prevent XSS injection
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * Extracts mentioned user handles from message body (e.g., @john)
 */
export const extractMentionHandles = (text) => {
  if (!text) return [];
  const matches = text.match(/@([a-zA-Z0-9._-]+)/g);
  if (!matches) return [];
  return Array.from(new Set(matches.map((m) => m.slice(1).toLowerCase())));
};
