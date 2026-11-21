/**
 * Safely derive a fallback display username from a Firebase Auth user or profile object.
 */
export function deriveUsernameFromAuthUser(authUser) {
  const displayName = typeof authUser?.displayName === 'string' ? authUser.displayName.trim() : '';
  if (displayName) return displayName;

  const email = typeof authUser?.email === 'string' ? authUser.email.trim() : '';
  if (email && email.includes('@')) {
    return email.split('@')[0];
  }

  const uid = String(authUser?.uid || authUser?.id || 'guest').trim();
  return `user_${uid.slice(0, 6) || 'guest'}`;
}
