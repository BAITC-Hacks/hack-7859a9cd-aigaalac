import type { Category } from "@/lib/types";

const paths: Record<
  Category | "arrow" | "check" | "spark" | "reset",
  React.ReactNode
> = {
  transport: (
    <>
      <rect x="5" y="3" width="14" height="16" rx="4" />
      <path d="M5 11h14M8 19v2m8-2v2M8 15h.01M16 15h.01M9 6h6" />
    </>
  ),
  ecology: (
    <>
      <path d="M12 21v-8m-4 4 4-4 4 1M20 3c0 10-3 15-10 14C3 16 2 7 20 3Z" />
    </>
  ),
  social: (
    <>
      <path d="M3 10 12 3l9 7v11H3V10Zm6 11v-7h6v7M9 9h6m-3-3v6" />
    </>
  ),
  safety: (
    <>
      <path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" />
      <path d="m8 12 3 3 5-6" />
    </>
  ),
  services: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <path d="M8 8h8M8 12h5m-5 4h3m5-3v5m-2-2h4" />
    </>
  ),
  arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  check: <path d="m5 12 4 4L19 6" />,
  spark: (
    <>
      <path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z" />
      <path d="m20 2 .5 1.5L22 4l-1.5.5L20 6l-.5-1.5L18 4l1.5-.5L20 2Z" />
    </>
  ),
  reset: (
    <>
      <path d="M4 9a8 8 0 1 1 0 7M4 3v6h6" />
    </>
  ),
};

export function Icon({
  name,
  size = 22,
}: {
  name: keyof typeof paths;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
