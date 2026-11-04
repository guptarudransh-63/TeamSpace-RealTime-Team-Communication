/**
 * Helper to encode and decode deterministic message pagination cursors.
 * Combines createdAt ISO timestamp and MongoDB _id to guarantee stable, deterministic ordering.
 */

export const encodeCursor = (createdAt, id) => {
  if (!createdAt || !id) return null;
  const iso = new Date(createdAt).toISOString();
  return Buffer.from(`${iso}__${id}`).toString('base64');
};

export const decodeCursor = (cursor) => {
  if (!cursor) return null;
  try {
    const raw = Buffer.from(cursor, 'base64').toString('utf-8');
    const [isoString, id] = raw.split('__');
    const date = new Date(isoString);
    if (isNaN(date.getTime()) || !id) return null;
    return { createdAt: date, id };
  } catch {
    return null;
  }
};
