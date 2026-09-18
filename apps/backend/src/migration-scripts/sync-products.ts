import { readFileSync } from "node:fs";
import path from "node:path";
import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys, ProductStatus } from "@medusajs/framework/utils";
import {
  createInventoryLevelsWorkflow,
  createProductOptionsWorkflow,
  createProductsWorkflow,
} from "@medusajs/medusa/core-flows";
import type { ProductListing } from "@ninecrate/types";

// @ninecrate/data-store is ESM-only and can't be require()'d by Medusa's
// CJS-transpiled `medusa exec` runner, so this reads data/products.json
// directly instead — same file, same format, no cross-module-system import.
function readProducts(): ProductListing[] {
  const dataFile = path.resolve(__dirname, "../../../../data/products.json");
  try {
    const raw = readFileSync(dataFile, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err: any) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

/**
 * Syncs scraped listings from data/products.json (written by
 * workers/import-pipeline) into the Medusa catalog: one Medusa product per
 * listing, published, attached to the default sales channel and shipping
 * profile, with inventory stocked at the default warehouse.
 *
 * Idempotent by handle (`aliexpress-<sourceId>`) — re-running only creates
 * products for sourceIds not already in the catalog; it does not update
 * existing ones (re-scraping a changed listing needs a separate update path,
 * not built yet).
 *
 * Run with: pnpm exec medusa exec ./src/migration-scripts/sync-products.ts
 */
export default async function sync_products({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const listings = readProducts();
  if (listings.length === 0) {
    logger.info("No products in data/products.json — nothing to sync.");
    return;
  }

  const { data: salesChannels } = await query.graph({
    entity: "sales_channel",
    fields: ["id"],
  });
  const salesChannel = salesChannels[0];
  if (!salesChannel) {
    throw new Error(
      "No sales channel found. Run bootstrap-store.ts before sync-products.ts."
    );
  }

  const { data: shippingProfiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
  });
  const shippingProfile = shippingProfiles[0];
  if (!shippingProfile) {
    throw new Error(
      "No shipping profile found. Run bootstrap-store.ts before sync-products.ts."
    );
  }

  const { data: stockLocations } = await query.graph({
    entity: "stock_location",
    fields: ["id"],
  });
  const stockLocation = stockLocations[0];
  if (!stockLocation) {
    throw new Error(
      "No stock location found. Run bootstrap-store.ts before sync-products.ts."
    );
  }

  const { data: existingProducts } = await query.graph({
    entity: "product",
    fields: ["handle"],
  });
  const existingHandles = new Set(existingProducts.map((p) => p.handle));

  const toSync = listings.filter(
    (listing) => !existingHandles.has(handleFor(listing))
  );

  if (toSync.length === 0) {
    logger.info(`All ${listings.length} product(s) already synced.`);
    return;
  }

  logger.info(`Syncing ${toSync.length} product(s) to Medusa...`);

  for (const listing of toSync) {
    await syncOne(container, listing, {
      salesChannelId: salesChannel.id,
      shippingProfileId: shippingProfile.id,
    });
  }

  // Stock every inventory item that doesn't have a level at our location yet.
  const { data: inventoryItems } = await query.graph({
    entity: "inventory_item",
    fields: ["id", "location_levels.location_id"],
  });
  const unstocked = inventoryItems.filter(
    (item) =>
      !item.location_levels?.some((l: any) => l.location_id === stockLocation.id)
  );

  if (unstocked.length > 0) {
    await createInventoryLevelsWorkflow(container).run({
      input: {
        inventory_levels: unstocked.map((item) => ({
          location_id: stockLocation.id,
          stocked_quantity: 100,
          inventory_item_id: item.id,
        })),
      },
    });
  }

  logger.info(`Synced ${toSync.length} product(s).`);
}

function handleFor(listing: ProductListing): string {
  return `aliexpress-${listing.sourceId}`;
}

async function syncOne(
  container: MedusaContainer,
  listing: ProductListing,
  ctx: { salesChannelId: string; shippingProfileId: string }
) {
  const hasVariants = listing.variants.length > 0;

  const { result: optionsResult } = await createProductOptionsWorkflow(
    container
  ).run({
    input: {
      product_options: [
        {
          title: "Variant",
          values: hasVariants ? listing.variants.map((v) => v.label) : ["Default"],
        },
      ],
    },
  });
  const variantOption = optionsResult[0];

  const variants = hasVariants
    ? listing.variants.map((v, i) => ({
        title: v.label,
        sku: v.sku || `${listing.sourceId}-${i}`,
        options: { Variant: v.label },
        prices: [{ amount: v.price || listing.price, currency_code: listing.currency.toLowerCase() }],
      }))
    : [
        {
          title: "Default",
          sku: `${listing.sourceId}-default`,
          options: { Variant: "Default" },
          prices: [{ amount: listing.price, currency_code: listing.currency.toLowerCase() }],
        },
      ];

  await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: listing.title,
          handle: handleFor(listing),
          description: listing.description,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: ctx.shippingProfileId,
          images: listing.images.map((url) => ({ url })),
          options: [{ id: variantOption.id }],
          variants,
          sales_channels: [{ id: ctx.salesChannelId }],
          metadata: { source_url: listing.sourceUrl, source: "aliexpress" },
        },
      ],
    },
  });
}
