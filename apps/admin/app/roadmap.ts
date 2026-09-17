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
    phase: "TikTok auto-posting",
    status: "not-started",
    note: "Requires a TikTok for Business developer app plus per-account OAuth. Content is generated for manual review/posting today.",
    eta: "1–2 dev days once the developer app is approved (approval timeline is TikTok's, not ours)",
  },
  {
    phase: "Admin dashboard",
    status: "done",
    note: "Built, security-reviewed for XSS, and live-tested with seeded data.",
    eta: "—",
  },
  {
    phase: "Dashboard authentication",
    status: "not-started",
    note: "Currently open to anyone on the network — fine for local use, not for a shared deployment.",
    eta: "2–4 hrs",
  },
  {
    phase: "Automated test suite",
    status: "not-started",
    note: "Only manual/scripted smoke tests exist today; no regression protection.",
    eta: "~1 day for meaningful coverage",
  },
  {
    phase: "Medusa backend",
    status: "not-started",
    note: "apps/backend is an empty scaffold — no product catalog, checkout, or order flow yet.",
    eta: "2–3 days for an MVP",
  },
  {
    phase: "Storefront",
    status: "not-started",
    note: "apps/storefront is an empty scaffold.",
    eta: "2–3 days for an MVP",
  },
  {
    phase: "Persistent database",
    status: "not-started",
    note: "Currently flat JSON files under data/ — fine for a single operator, not for production.",
    eta: "Folded into the backend work above",
  },
];
