import type { LucideIcon } from "lucide-react";
export function StatCard({
  label,
  value,
  suffix,
  detail,
  icon: Icon,
  accent = false,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  detail: string;
  icon: LucideIcon;
  accent?: boolean;
}) {
  return (
    <div className={`stat-card ${accent ? "stat-accent" : ""}`}>
      <div className="stat-top">
        <span>{label}</span>
        <Icon size={19} />
      </div>
      <div className="stat-value">
        {value}
        <span>{suffix}</span>
      </div>
      <div className="stat-detail">{detail}</div>
    </div>
  );
}
