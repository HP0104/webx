function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Match a bank transfer transaction code on token boundaries so short prefixes
 * like NAP1 do not accidentally match NAP10 or NAP12.
 */
export function matchesSePayTxCode(text, txCode) {
  const cleanCode = String(txCode || '').trim();
  const cleanText = String(text || '');
  if (!cleanCode || !cleanText) return false;

  const boundaryRegex = new RegExp(`(?:^|[^a-z0-9])${escapeRegExp(cleanCode)}(?:$|[^a-z0-9])`, 'i');
  return boundaryRegex.test(cleanText);
}

/**
 * Return the request Origin if it is explicitly present in the allowlist, else null.
 */
export function resolveAllowedCorsOrigin(origin, allowedOrigins = []) {
  if (!origin || typeof origin !== 'string') return null;
  return allowedOrigins.includes(origin) ? origin : null;
}
