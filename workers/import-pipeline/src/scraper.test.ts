import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { extractItemId, parseItem, fetchRawItem } from "./scraper.js";

describe("extractItemId", () => {
  it("extracts the id from a valid https product URL", () => {
    expect(extractItemId("https://www.aliexpress.com/item/1005006123456789.html")).toBe(
      "1005006123456789"
    );
  });

  it("extracts the id from a valid http product URL", () => {
    expect(extractItemId("http://aliexpress.com/item/42.html")).toBe("42");
  });

  it("rejects a javascript: URL even if it contains an /item/<id>.html-looking substring", () => {
    expect(() =>
      extractItemId("javascript:alert(document.cookie)//item/123.html")
    ).toThrow(/scheme/i);
  });

  it("rejects a data: URL", () => {
    expect(() => extractItemId("data:text/html,<script>alert(1)</script>")).toThrow(/scheme/i);
  });

  it("rejects a string that isn't a URL at all", () => {
    expect(() => extractItemId("not a url at all /item/123.html")).toThrow(/not a valid URL/i);
  });

  it("rejects a URL with no /item/<id>.html path", () => {
    expect(() => extractItemId("https://aliexpress.com/product/123")).toThrow(
      /Could not find an item id/i
    );
  });

  it("rejects an id hidden only in the query string, not the path", () => {
    expect(() => extractItemId("https://aliexpress.com/?x=/item/123.html")).toThrow(
      /Could not find an item id/i
    );
  });
});

describe("parseItem", () => {
  const sourceUrl = "https://www.aliexpress.com/item/123.html";
  const sourceId = "123";

  it("parses a well-formed response nested under result.item", () => {
    const raw = {
      result: {
        item: {
          title: "Cozy Throw Blanket",
          description: "Soft and warm",
          images: ["https://img.example/1.jpg", "https://img.example/2.jpg"],
          sku: {
            def: { promotionPrice: "19.99", currency: "USD" },
            skus: [{ skuId: "s1", propertyValueDefinitionName: "Blue", promotionPrice: "19.99" }],
          },
        },
      },
    };

    const listing = parseItem(raw, sourceUrl, sourceId);

    expect(listing).toEqual({
      sourceId,
      sourceUrl,
      title: "Cozy Throw Blanket",
      description: "Soft and warm",
      images: ["https://img.example/1.jpg", "https://img.example/2.jpg"],
      price: 19.99,
      currency: "USD",
      variants: [{ sku: "s1", label: "Blue", price: 19.99, images: [] }],
    });
  });

  it("falls back through alternate field names (subject/imageUrls/skuBase)", () => {
    const raw = {
      item: {
        subject: "Alt-shape product",
        imageUrls: [{ url: "https://img.example/a.jpg" }],
        skuBase: { price: 5, currency: "EUR" },
      },
    };

    const listing = parseItem(raw, sourceUrl, sourceId);

    expect(listing.title).toBe("Alt-shape product");
    expect(listing.images).toEqual(["https://img.example/a.jpg"]);
    expect(listing.price).toBe(5);
    expect(listing.currency).toBe("EUR");
  });

  it("defaults currency to USD when nothing specifies one", () => {
    const raw = { item: { title: "No currency", images: ["https://img.example/x.jpg"], price: 3 } };
    expect(parseItem(raw, sourceUrl, sourceId).currency).toBe("USD");
  });

  it("throws a specific error when the item object can't be located", () => {
    // Only a non-object root (null/primitive) can miss every fallback —
    // an object root without .item/.result.item falls back to itself.
    expect(() => parseItem(null, sourceUrl, sourceId)).toThrow(
      /could not locate an "item" object/i
    );
  });

  it("throws a specific error when no title field is found", () => {
    const raw = { item: { images: ["https://img.example/x.jpg"], price: 1 } };
    expect(() => parseItem(raw, sourceUrl, sourceId)).toThrow(/could not find a title field/i);
  });

  it("throws a specific error when no images are found", () => {
    const raw = { item: { title: "No images", price: 1 } };
    expect(() => parseItem(raw, sourceUrl, sourceId)).toThrow(/could not find any images/i);
  });

  it("throws a specific error when no numeric price is found", () => {
    const raw = { item: { title: "No price", images: ["https://img.example/x.jpg"] } };
    expect(() => parseItem(raw, sourceUrl, sourceId)).toThrow(/could not find a numeric price/i);
  });

  it("parses a price string with currency symbols", () => {
    const raw = { item: { title: "Priced", images: ["https://img.example/x.jpg"], price: "$12.50" } };
    expect(parseItem(raw, sourceUrl, sourceId).price).toBe(12.5);
  });
});

describe("fetchRawItem", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.unstubAllGlobals();
  });

  it("throws without calling fetch when RAPIDAPI_KEY is unset", async () => {
    delete process.env.RAPIDAPI_KEY;
    await expect(fetchRawItem("123")).rejects.toThrow(/RAPIDAPI_KEY is not set/i);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("throws with the response body when the API returns a non-ok status", async () => {
    process.env.RAPIDAPI_KEY = "test-key";
    (fetch as any).mockResolvedValue({
      ok: false,
      status: 403,
      statusText: "Forbidden",
      text: async () => "quota exceeded",
    });

    await expect(fetchRawItem("123")).rejects.toThrow(/403.*quota exceeded/s);
  });

  it("returns the parsed JSON body on success", async () => {
    process.env.RAPIDAPI_KEY = "test-key";
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ result: { item: { title: "ok" } } }),
    });

    const result = await fetchRawItem("123");
    expect(result).toEqual({ result: { item: { title: "ok" } } });
  });
});
