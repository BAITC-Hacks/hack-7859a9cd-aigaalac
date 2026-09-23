import { ArrowUpRight, Building2 } from "lucide-react";
import type { District } from "@/types";
export default function DistrictCard({
  district,
  selected,
  onSelect,
}: {
  district: District;
  selected: boolean;
  onSelect: () => void;
}) {
  const critical = Object.values(district.indicators).some(
    (value) => value < 40,
  );
  return (
    <button
      className={`district-card ${selected ? "selected" : ""}`}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <div className="district-card-top">
        <Building2 size={20} />
        <ArrowUpRight size={16} />
      </div>
      <h3>{district.name}</h3>
      <div className="district-score">
        {district.score.toFixed(2)} <span>QoL</span>
      </div>
      <div className="mini-track">
        <span style={{ width: `${district.score}%` }} />
      </div>
      <span className={`district-status ${critical ? "critical-text" : ""}`}>
        <span />
        {critical ? "Needs attention" : "Stable outlook"}
      </span>
    </button>
  );
}
