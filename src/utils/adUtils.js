export const ADBLOCK_EXEMPT_ROUTES = ['/auth', '/wallet', '/report', '/privacy', '/contact'];

export function isAdBlockExemptPath(pathname = '/') {
  const normalized = (String(pathname || '/').replace(/\/+$/, '') || '/').toLowerCase();
  return ADBLOCK_EXEMPT_ROUTES.some(
    (route) => normalized === route || normalized.startsWith(`${route}/`)
  );
}
