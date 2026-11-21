/** Shared by the leaderboard query (server) and its tabs (browser). */
export type LeaderboardCategory = "robux" | "gamepass" | "items";
export const LEADERBOARD_CATEGORIES: readonly LeaderboardCategory[] = ["robux", "gamepass", "items"];

export interface LeaderboardEntry {
  rank: number;
  name: string;
  avatarUrl: string | null;
  /** Robux bought (robux) or completed orders (gamepass / items). */
  value: number;
}

export type Leaderboard = Record<LeaderboardCategory, LeaderboardEntry[]>;
