import { gamepassGames, type GamepassGame } from "@/data/gamepasses";
import { products } from "@/data/products";
import type { Locale } from "@/i18n/config";
import type { Product, ProductCategory, ProductOption } from "@/types";
import { normalize } from "@/lib/utils";

export const GAMEPASS_SLUG_PREFIX = "gamepass-";

/**
 * A gamepass game seen as a checkout product: its gamepasses become the selectable options.
 * Gamepasses are delivered as an in-game gift to the customer's Roblox username.
 */
function gamepassGameToProduct(game: GamepassGame): Product {
  return {
    slug: `${GAMEPASS_SLUG_PREFIX}${game.slug}`,
    name: game.name,
    subtitle: game.description,
    category: "gamepass",
    icon: game.icon,
    accent: game.accent,
    tag: game.tag,
    delivery: "gift",
    options: game.passes.map((pass) => ({
      id: pass.id,
      label: { id: pass.name, en: pass.name },
      amount: pass.robux,
      price: pass.price,
      ...(pass.originalPrice ? { originalPrice: pass.originalPrice } : {}),
    })),
  };
}

const gamepassProducts: readonly Product[] = gamepassGames.map(gamepassGameToProduct);

/** Looks up regular products and gamepass products (slug `gamepass-<game>`). */
export function getProductBySlug(slug: string) {
  return products.find((product) => product.slug === slug) ?? gamepassProducts.find((product) => product.slug === slug);
}

export function getGamepassGame(slug: string) {
  return gamepassGames.find((game) => game.slug === slug);
}

export function getGamepassStartingPrice(game: GamepassGame) {
  return Math.min(...game.passes.map((pass) => pass.price));
}

export function filterGamepassGames(query: string) {
  const q = normalize(query);
  if (!q) return gamepassGames;
  return gamepassGames.filter((game) =>
    normalize([game.name, ...game.passes.map((pass) => pass.name)].join(" ")).includes(q),
  );
}

export function getStartingPrice(product: Product) {
  return Math.min(...product.options.map((option) => option.price));
}

export function getShopProducts() {
  return products;
}

export function filterProducts(
  list: readonly Product[],
  category: ProductCategory | "all",
  query: string,
  locale: Locale,
) {
  const q = normalize(query);
  return list.filter((product) => {
    if (category !== "all" && product.category !== category) return false;
    if (!q) return true;
    const haystack = [
      product.name,
      product.subtitle[locale],
      ...product.options.map((option) => option.label[locale]),
    ].join(" ");
    return normalize(haystack).includes(q);
  });
}

export interface FlashDeal {
  product: Product;
  option: ProductOption & { originalPrice: number };
}

/** Flash deals are derived from the catalogue: any option with an `originalPrice`. */
export function getFlashDeals(): FlashDeal[] {
  return products.flatMap((product) =>
    product.options
      .filter((option): option is FlashDeal["option"] => typeof option.originalPrice === "number")
      .map((option) => ({ product, option })),
  );
}
