export const APP_VERSION = "1.0.1";

/**
 * Compares two version strings (e.g. "1.0.1" vs "1.0.0").
 * Returns true if hostVer is strictly greater than clientVer.
 */
export function isLaterVersion(hostVer?: string, clientVer?: string): boolean {
  if (!hostVer || !clientVer) return false;
  if (hostVer === clientVer) return false;

  const hostParts = hostVer.split(".").map((p) => {
    const n = parseInt(p, 10);
    return isNaN(n) ? 0 : n;
  });
  const clientParts = clientVer.split(".").map((p) => {
    const n = parseInt(p, 10);
    return isNaN(n) ? 0 : n;
  });

  const maxLen = Math.max(hostParts.length, clientParts.length);
  for (let i = 0; i < maxLen; i++) {
    const h = hostParts[i] ?? 0;
    const c = clientParts[i] ?? 0;
    if (h > c) return true;
    if (h < c) return false;
  }

  return hostVer > clientVer;
}
