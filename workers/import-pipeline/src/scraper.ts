import type { ProductListing, ProductVariant } from "@ninecrate/types";

const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST ?? "aliexpress-datahub.p.rapidapi.com";
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;

/**
 * Pulls the numeric AliExpress item id out of a product page URL, e.g.
 * https://www.aliexpress.com/item/1005006123456789.html -> "1005006123456789"
 */
export function extractItemId(productUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(productUrl);
  } catch {
    throw new Error(`"${productUrl}" is not a valid URL.`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(
      `Refusing to process URL with scheme "${parsed.protocol}" — only http(s) URLs are allowed.`
    );
  }

  const match = parsed.pathname.match(/\/item\/(\d+)\.html/);
  if (!match) {
    throw new Error(
      `Could not find an item id in URL "${productUrl}". Expected a pattern like ` +
        `.../item/1234567890.html`
    );
  }
  return match[1];
}

/**
 * Calls the "AliExpress DataHub" listing on RapidAPI for a single item's detail.
 *
 * NOT YET VERIFIED against live docs: RapidAPI's docs page for this listing is
 * JS-rendered and login-gated, so the endpoint path/query param below is a
 * best guess based on how this listing's peers are commonly shaped. Once you
 * subscribe, open the "Test Endpoint" tab, run it against a real item, and
 * confirm against this function:
 *   - the endpoint path (currently assumed "/item_detail")
 *   - the query param name for the item id (currently assumed "itemId")
 * Fix here if either differs.
 */
export async function fetchRawItem(itemId: string): Promise<unknown> {
  if (!RAPIDAPI_KEY) {
    throw new Error(
      "RAPIDAPI_KEY is not set. Copy .env.example to .env and add your RapidAPI key."
    );
  }

  const url = `https://${RAPIDAPI_HOST}/item_detail?itemId=${encodeURIComponent(itemId)}`;
  const res = await fetch(url, {
    headers: {
      "x-rapidapi-key": RAPIDAPI_KEY,
      "x-rapidapi-host": RAPIDAPI_HOST,
    },
  });

  if (!res.ok) {
    throw new Error(
      `RapidAPI request failed: ${res.status} ${res.statusText}. ` +
        `Body: ${await res.text().catch(() => "<unreadable>")}`
    );
  }

  return res.json();
}

/**
 * Maps the raw RapidAPI response into our internal ProductListing shape.
 *
 * FIELD PATHS BELOW ARE UNVERIFIED (see fetchRawItem docstring). This function
 * is intentionally defensive: it tries a couple of plausible response shapes
 * and throws a clear, specific error naming exactly which field was missing
 * if none match, rather than silently producing a half-populated listing.
 *
 * To fix on first real run:
 *   1. Run a real item through RapidAPI's "Test Endpoint" tab.
 *   2. Compare the JSON you get back to the `candidates` paths tried below.
 *   3. Add/adjust a candidate path so it matches the real shape.
 */
export function parseItem(raw: unknown, sourceUrl: string, sourceId: string): ProductListing {
  const root = raw as Record<string, any>;
  const item = root?.result?.item ?? root?.item ?? root;

  if (!item || typeof item !== "object") {
    throw new Error(
      `parseItem: could not locate an "item" object in the API response. ` +
        `Checked root.result.item, root.item, and root itself. ` +
        `Raw response keys: ${Object.keys(root ?? {}).join(", ") || "<none>"}`
    );
  }

  const title: string | undefined = item.title ?? item.subject ?? item.name;
  if (!title) {
    throw new Error(
      `parseItem: could not find a title field. Checked item.title, item.subject, item.name.`
    );
  }

  const description: string =
    item.description ?? item.desc ?? item.detail?.description ?? "";

  const images: string[] = normalizeImages(
    item.images ?? item.imageUrls ?? item.itemImages ?? item.gallery
  );
  if (images.length === 0) {
    throw new Error(
      `parseItem: could not find any images. Checked item.images, item.imageUrls, ` +
        `item.itemImages, item.gallery.`
    );
  }

  const priceInfo = item.sku?.def ?? item.price ?? item.skuBase;
  const rawPrice =
    priceInfo?.promotionPrice ?? priceInfo?.price ?? priceInfo?.salePrice ?? item.price;
  const price = toNumber(rawPrice);
  if (price === undefined) {
    throw new Error(
      `parseItem: could not find a numeric price. Checked item.sku.def, item.price, ` +
        `item.skuBase for promotionPrice/price/salePrice fields.`
    );
  }

  const currency: string =
    priceInfo?.currency ?? item.currency ?? item.currencyCode ?? "USD";

  const variants = parseVariants(item.sku?.skus ?? item.skus ?? item.variants);

  return {
    sourceId,
    sourceUrl,
    title,
    description,
    images,
    price,
    currency,
    variants,
  };
}

function normalizeImages(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => (typeof v === "string" ? v : v?.url ?? v?.imageUrl))
    .filter((v): v is string => typeof v === "string" && v.length > 0);
}

function parseVariants(value: unknown): ProductVariant[] {
  if (!Array.isArray(value)) return [];
  return value.map((sku: any, i: number) => ({
    sku: sku.skuId ?? sku.id ?? `variant-${i}`,
    label:
      sku.propertyValueDefinitionName ??
      sku.skuAttr ??
      sku.name ??
      `Variant ${i + 1}`,
    price: toNumber(sku.promotionPrice ?? sku.price) ?? 0,
    images: normalizeImages(sku.images ?? sku.skuImage ? [sku.skuImage] : undefined),
  }));
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.]/g, "");
    const n = parseFloat(cleaned);
    return Number.isNaN(n) ? undefined : n;
  }
  return undefined;
}

export async function scrapeProduct(productUrl: string): Promise<ProductListing> {
  const itemId = extractItemId(productUrl);
  const raw = await fetchRawItem(itemId);
  return parseItem(raw, productUrl, itemId);
}
