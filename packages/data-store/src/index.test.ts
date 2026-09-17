import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { ProductListing, TikTokContent } from "@ninecrate/types";

// The module reads NINECRATE_DATA_DIR from process.env at top-level import
// time, so it must be set before the (dynamic) import happens.
let tmpDir: string;
let store: typeof import("./index.js");

beforeAll(async () => {
  tmpDir = mkdtempSync(path.join(tmpdir(), "ninecrate-data-store-test-"));
  process.env.NINECRATE_DATA_DIR = tmpDir;
  store = await import("./index.js");
});

afterAll(() => {
  delete process.env.NINECRATE_DATA_DIR;
  rmSync(tmpDir, { recursive: true, force: true });
});

function makeListing(sourceId: string, overrides: Partial<ProductListing> = {}): ProductListing {
  return {
    sourceId,
    sourceUrl: `https://example.com/item/${sourceId}.html`,
    title: `Product ${sourceId}`,
    description: "",
    images: [],
    price: 9.99,
    currency: "USD",
    variants: [],
    ...overrides,
  };
}

const sampleContent: TikTokContent = {
  hook: "hook",
  script: "script",
  caption: "caption",
  hashtags: ["a", "b"],
};

describe("data-store", () => {
  it("returns an empty array when no products file exists yet", async () => {
    expect(await store.readProducts()).toEqual([]);
  });

  it("upserts a new product and reads it back", async () => {
    await store.upsertProduct(makeListing("p1"));
    const products = await store.readProducts();
    expect(products).toHaveLength(1);
    expect(products[0].sourceId).toBe("p1");
  });

  it("updates an existing product in place instead of duplicating it", async () => {
    await store.upsertProduct(makeListing("p1", { title: "Updated title" }));
    const products = await store.readProducts();
    expect(products).toHaveLength(1);
    expect(products[0].title).toBe("Updated title");
  });

  it("adds a second distinct product alongside the first", async () => {
    await store.upsertProduct(makeListing("p2"));
    const products = await store.readProducts();
    expect(products.map((p) => p.sourceId).sort()).toEqual(["p1", "p2"]);
  });

  it("upserts TikTok content keyed by sourceId", async () => {
    await store.upsertTikTokContent("p1", sampleContent);
    const records = await store.readTikTokContent();
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ sourceId: "p1", content: sampleContent });
    expect(records[0].generatedAt).toBeTypeOf("string");
  });

  it("merges products with their TikTok content, leaving ungenerated ones null", async () => {
    const merged = await store.getProductsWithContent();
    const p1 = merged.find((p) => p.sourceId === "p1")!;
    const p2 = merged.find((p) => p.sourceId === "p2")!;

    expect(p1.tiktok).toEqual(sampleContent);
    expect(p1.tiktokGeneratedAt).toBeTypeOf("string");
    expect(p2.tiktok).toBeNull();
    expect(p2.tiktokGeneratedAt).toBeNull();
  });
});
