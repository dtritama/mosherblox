/**
 * Public-facing buyer names (reviews, leaderboard): recognisable to the buyer, not fully exposed.
 *   "Builderman_01" → "Bui•••01"   "Alex12" → "Al•••2"   "Ana" → "A•••"
 */
export function maskUsername(username: string): string {
  const name = username.trim();
  if (name.length <= 4) return `${name.slice(0, 1)}•••`;
  if (name.length <= 6) return `${name.slice(0, 2)}•••${name.slice(-1)}`;
  return `${name.slice(0, 3)}•••${name.slice(-2)}`;
}
