export type RoadmapStatus = "done" | "blocked" | "not-started";

export interface RoadmapItem {
  phase: string;
  status: RoadmapStatus;
  note: string;
  eta: string;
}

export const roadmap: RoadmapItem[] = [
  {
    phase: "Monorepo scaffold",
    status: "done",
    note: "pnpm workspace, shared types, file-based data store — typechecked, built, and live-tested.",
    eta: "—",
  },
  {
    phase: "AliExpress scraper",
    status: "blocked",
    note: "Built and defensively tested, but the RapidAPI field-name mappings are unverified against a real response.",
    eta: "1–2 hrs once a RapidAPI key is provided",
  },
  {
    phase: "TikTok content generation",
    status: "blocked",
    note: "Built and tested against every error path; needs a real Anthropic key to verify actual output quality.",
    eta: "~30 min once an Anthropic key is provided",
  },
  {
    phase: "Admin dashboard",
    status: "done",
    note: "Built, security-reviewed for XSS, and live-tested with seeded data.",
    eta: "—",
  },
  {
    phase: "Dashboard authentication",
    status: "done",
    note: "HTTP Basic Auth via Next.js Proxy, timing-safe credential comparison. Set ADMIN_USERNAME/ADMIN_PASSWORD to enable.",
    eta: "—",
  },
  {
    phase: "Automated test suite",
    status: "done",
    note: "31 vitest unit tests across the scraper, content generation, and data store. Run with `pnpm run test`.",
    eta: "—",
  },
  {
    phase: "Medusa backend",
    status: "done",
    note: "Running against a real Postgres instance on Railway. Region/sales-channel/shipping bootstrapped, plus a sync script pulling scraped listings from data/products.json into the catalog. Verified live: cart -> shipping -> payment -> completed order.",
    eta: "—",
  },
  {
    phase: "Storefront",
    status: "done",
    note: "Medusa's official Next.js starter, wired to the backend above. Verified live: product listing, product detail page, add-to-cart, full checkout.",
    eta: "—",
  },
  {
    phase: "Real payment processor (Stripe)",
    status: "blocked",
    note: "Checkout currently completes with Medusa's built-in test payment provider (pp_system_default) — no real payment processor wired up yet.",
    eta: "~1 hr once a Stripe test key is provided",
  },
  {
    phase: "Persistent database",
    status: "done",
    note: "Postgres on Railway backs the Medusa catalog/orders. The scraper/TikTok pipeline still uses flat JSON files in data/ as its own lightweight staging area before products enter the catalog — that's intentional, not a gap.",
    eta: "—",
  },
];
