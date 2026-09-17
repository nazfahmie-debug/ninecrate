import type { RoadmapStatus } from "./roadmap";

const CONFIG: Record<RoadmapStatus, { label: string; className: string; icon: React.ReactNode }> = {
  done: {
    label: "Done",
    className: "pill pill--good",
    icon: (
      <svg viewBox="0 0 16 16" width="12" height="12" fill="none" aria-hidden="true">
        <path d="M3 8.5L6 11.5L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  blocked: {
    label: "Blocked on you",
    className: "pill pill--warning",
    icon: (
      <svg viewBox="0 0 16 16" width="12" height="12" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" />
        <path d="M8 5v3.2l2.2 1.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  "not-started": {
    label: "Not started",
    className: "pill pill--muted",
    icon: (
      <svg viewBox="0 0 16 16" width="12" height="12" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeDasharray="2 2" />
      </svg>
    ),
  },
};

export function StatusPill({ status }: { status: RoadmapStatus }) {
  const { label, className, icon } = CONFIG[status];
  return (
    <span className={className}>
      {icon}
      {label}
    </span>
  );
}
