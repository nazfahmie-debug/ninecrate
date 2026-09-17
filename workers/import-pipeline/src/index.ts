import "dotenv/config";
import { upsertProduct } from "@ninecrate/data-store";
import { scrapeProduct } from "./scraper.js";

const productUrl = process.argv[2];

if (!productUrl) {
  console.error("Usage: pnpm run scrape <aliexpress-product-url>");
  process.exit(1);
}

scrapeProduct(productUrl)
  .then(async (listing) => {
    await upsertProduct(listing);
    console.log(JSON.stringify(listing, null, 2));
    console.log(`\nSaved to data/products.json (sourceId: ${listing.sourceId})`);
  })
  .catch((err) => {
    console.error("Scrape failed:", err.message);
    process.exit(1);
  });
