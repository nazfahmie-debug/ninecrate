import { fileURLToPath } from "node:url";
import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import type { ProductListing, TikTokContent, TikTokContentRecord } from "@ninecrate/types";

// Resolved from this file's own location (not process.cwd()) so every
// consumer — the workers, the Next.js dashboard, etc. — reads/writes the
// same directory regardless of where the process was launched from.
const PACKAGE_DIR = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(PACKAGE_DIR, "../../../data");
const PRODUCTS_FILE = path.join(DATA_DIR, "products.json");
const TIKTOK_CONTENT_FILE = path.join(DATA_DIR, "tiktok-content.json");

async function readJsonArray<T>(file: string): Promise<T[]> {
  try {
    const raw = await readFile(file, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err: any) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

async function writeJsonArray(file: string, data: unknown[]): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(file, JSON.stringify(data, null, 2), "utf-8");
}

export async function readProducts(): Promise<ProductListing[]> {
  return readJsonArray<ProductListing>(PRODUCTS_FILE);
}

export async function upsertProduct(listing: ProductListing): Promise<void> {
  const products = await readProducts();
  const idx = products.findIndex((p) => p.sourceId === listing.sourceId);
  if (idx >= 0) {
    products[idx] = listing;
  } else {
    products.push(listing);
  }
  await writeJsonArray(PRODUCTS_FILE, products);
}

export async function readTikTokContent(): Promise<TikTokContentRecord[]> {
  return readJsonArray<TikTokContentRecord>(TIKTOK_CONTENT_FILE);
}

export async function upsertTikTokContent(
  sourceId: string,
  content: TikTokContent
): Promise<void> {
  const records = await readTikTokContent();
  const record: TikTokContentRecord = { sourceId, content, generatedAt: new Date().toISOString() };
  const idx = records.findIndex((r) => r.sourceId === sourceId);
  if (idx >= 0) {
    records[idx] = record;
  } else {
    records.push(record);
  }
  await writeJsonArray(TIKTOK_CONTENT_FILE, records);
}

export interface ProductWithContent extends ProductListing {
  tiktok: TikTokContent | null;
  tiktokGeneratedAt: string | null;
}

export async function getProductsWithContent(): Promise<ProductWithContent[]> {
  const [products, content] = await Promise.all([readProducts(), readTikTokContent()]);
  const contentBySourceId = new Map(content.map((r) => [r.sourceId, r]));
  return products.map((p) => {
    const record = contentBySourceId.get(p.sourceId);
    return {
      ...p,
      tiktok: record?.content ?? null,
      tiktokGeneratedAt: record?.generatedAt ?? null,
    };
  });
}
