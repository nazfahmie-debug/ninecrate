import "dotenv/config";
import { generateTikTokContent } from "@ninecrate/ai-media-service";
import { readProducts, readTikTokContent, upsertTikTokContent } from "@ninecrate/data-store";

async function main() {
  const [products, existing] = await Promise.all([readProducts(), readTikTokContent()]);

  if (products.length === 0) {
    console.log("No products found in data/products.json. Run the import pipeline first.");
    return;
  }

  const alreadyGenerated = new Set(existing.map((r) => r.sourceId));
  const pending = products.filter((p) => !alreadyGenerated.has(p.sourceId));

  if (pending.length === 0) {
    console.log(`All ${products.length} product(s) already have TikTok content generated.`);
    return;
  }

  console.log(`Generating TikTok content for ${pending.length} product(s)...`);

  let succeeded = 0;
  let failed = 0;

  for (const product of pending) {
    try {
      const content = await generateTikTokContent(product);
      await upsertTikTokContent(product.sourceId, content);
      console.log(`  ✓ ${product.title}`);
      succeeded += 1;
    } catch (err: any) {
      console.error(`  ✗ ${product.title}: ${err.message}`);
      failed += 1;
    }
  }

  console.log(`\nDone. ${succeeded} succeeded, ${failed} failed.`);
  if (failed > 0) process.exitCode = 1;
}

main();
