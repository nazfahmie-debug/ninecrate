import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import {
  createApiKeysWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createStockLocationsWorkflow,
  createStoresWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
} from "@medusajs/medusa/core-flows";

/**
 * One-time store bootstrap for a fresh Medusa instance with no seed data:
 * a US region/sales channel/stock location/shipping setup so the storefront
 * and checkout have something to work against. No demo products — real
 * products come from sync-products.ts, which reads our own scraped catalog.
 *
 * Run with: pnpm exec medusa exec ./src/migration-scripts/bootstrap-store.ts
 *
 * Uses "pp_system_default" (Medusa's no-op test payment provider) since no
 * real payment processor key has been configured yet. Swap in Stripe by
 * adding @medusajs/payment-stripe to medusa-config.ts and passing its
 * provider id here once a Stripe test key is available.
 */
export default async function bootstrap_store({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const link = container.resolve(ContainerRegistrationKeys.LINK);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT);

  logger.info("Bootstrapping sales channel + publishable API key...");
  const {
    result: [defaultSalesChannel],
  } = await createSalesChannelsWorkflow(container).run({
    input: {
      salesChannelsData: [
        { name: "Default Sales Channel", description: "Ninecrate storefront" },
      ],
    },
  });

  const {
    result: [publishableApiKey],
  } = await createApiKeysWorkflow(container).run({
    input: {
      api_keys: [{ title: "Storefront", type: "publishable", created_by: "" }],
    },
  });

  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: { id: publishableApiKey.id, add: [defaultSalesChannel.id] },
  });

  logger.info("Bootstrapping store + region (US, USD)...");
  await createStoresWorkflow(container).run({
    input: {
      stores: [
        {
          name: "Ninecrate",
          supported_currencies: [{ currency_code: "usd", is_default: true }],
          default_sales_channel_id: defaultSalesChannel.id,
        },
      ],
    },
  });

  const { result: regionResult } = await createRegionsWorkflow(container).run({
    input: {
      regions: [
        {
          name: "United States",
          currency_code: "usd",
          countries: ["us"],
          payment_providers: ["pp_system_default"],
        },
      ],
    },
  });
  const region = regionResult[0];

  await createTaxRegionsWorkflow(container).run({
    input: [{ country_code: "us", provider_id: "tp_system" }],
  });

  logger.info("Bootstrapping stock location + shipping...");
  const { result: stockLocationResult } = await createStockLocationsWorkflow(
    container
  ).run({
    input: {
      locations: [
        {
          name: "Ninecrate Warehouse",
          address: { city: "Wilmington", country_code: "US", address_1: "" },
        },
      ],
    },
  });
  const stockLocation = stockLocationResult[0];

  await link.create({
    [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
    [Modules.FULFILLMENT]: { fulfillment_provider_id: "manual_manual" },
  });

  // Created by a core migration.
  const { data: shippingProfileResult } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
  });
  const shippingProfile = shippingProfileResult[0];

  const fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
    name: "Ninecrate Warehouse delivery",
    type: "shipping",
    service_zones: [
      { name: "United States", geo_zones: [{ country_code: "us", type: "country" }] },
    ],
  });

  await link.create({
    [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
    [Modules.FULFILLMENT]: { fulfillment_set_id: fulfillmentSet.id },
  });

  await createShippingOptionsWorkflow(container).run({
    input: [
      {
        name: "Standard Shipping",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: fulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: { label: "Standard", description: "Ship in 5-7 days.", code: "standard" },
        prices: [
          { currency_code: "usd", amount: 5 },
          { region_id: region.id, amount: 5 },
        ],
        rules: [
          { attribute: "enabled_in_store", value: "true", operator: "eq" },
          { attribute: "is_return", value: "false", operator: "eq" },
        ],
      },
    ],
  });

  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: { id: stockLocation.id, add: [defaultSalesChannel.id] },
  });

  logger.info("Store bootstrap complete.");
  logger.info(`Sales channel id: ${defaultSalesChannel.id}`);
  logger.info(`Publishable API key: ${publishableApiKey.token}`);
  logger.info(`Region id: ${region.id}`);
  logger.info(`Stock location id: ${stockLocation.id}`);
  logger.info(`Shipping profile id: ${shippingProfile.id}`);
}
