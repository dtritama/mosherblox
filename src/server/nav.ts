import "server-only";
import { navItems } from "@/config/site";
import { LEADERBOARD_CATEGORIES } from "@/lib/leaderboard";
import { getLeaderboard } from "@/server/leaderboard";
import { getPublicReviews } from "@/server/reviews";
import type { NavItem } from "@/types";

/** Menu links. The leaderboard and reviews sections hide while empty, so their links do too. */
export async function getNavItems(): Promise<NavItem[]> {
  const [leaderboard, reviews] = await Promise.all([getLeaderboard(), getPublicReviews()]);
  const empty = new Set<string>();
  if (LEADERBOARD_CATEGORIES.every((category) => leaderboard[category].length === 0)) empty.add("leaderboard");
  if (reviews.items.length === 0) empty.add("reviews");
  return navItems.filter((item) => !empty.has(item.key));
}
