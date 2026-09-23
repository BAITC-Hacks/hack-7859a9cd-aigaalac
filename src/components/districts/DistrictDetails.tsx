import { MapPin } from "lucide-react";
import type { District } from "@/types";
import IndicatorBar from "./IndicatorBar";
import { INDICATOR_IDS, INDICATOR_LABELS } from "@/data/indicators";
export default function DistrictDetails({ district }: { district: District }) {
  return (
    <section
      className="district-details"
      aria-label={`${district.name} indicators`}
    >
      <div className="detail-title">
        <span className="icon-box">
          <MapPin size={20} />
        </span>
        <div>
          <h3>{district.name} at a glance</h3>
          <p>
            {district.description} ·{" "}
            {(district.populationShare * 100).toFixed(0)}% of city population
          </p>
        </div>
        <span className="small muted">Below 40 = critical</span>
      </div>
      <div className="indicators-grid">
        {INDICATOR_IDS.map((key) => (
          <IndicatorBar
            key={key}
            label={`${key} · ${INDICATOR_LABELS[key]}`}
            value={district.indicators[key]}
          />
        ))}
      </div>
    </section>
  );
}
