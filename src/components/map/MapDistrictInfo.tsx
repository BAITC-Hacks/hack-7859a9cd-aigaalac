import { ArrowUpRight, MapPin } from "lucide-react";
import type { CSSProperties } from "react";
import type { District } from "@/types";
import { districtLocations } from "@/data/map";
import { INDICATOR_IDS, INDICATOR_LABELS } from "@/data/indicators";

export default function MapDistrictInfo({
  district,
  previewing,
  onFocus,
}: {
  district: District;
  previewing: boolean;
  onFocus: () => void;
}) {
  const critical = Object.values(district.indicators).filter(
    (value) => value < 40,
  ).length;
  return (
    <aside
      className="map-district-info"
      style={
        {
          "--district-color": districtLocations[district.id].color,
        } as CSSProperties
      }
    >
      <div className="map-info-eyebrow">
        <span />
        {previewing ? "EXPLORING DISTRICT" : "DISTRICT SPOTLIGHT"}
      </div>
      <div className="map-info-title">
        <h3>{district.name}</h3>
        <MapPin size={21} />
      </div>
      <p className="map-info-description">{district.description}</p>
      <div className="map-qol">
        <strong>{district.score.toFixed(2)}</strong>
        <span>
          QUALITY OF LIFE
          <br />
          <b>out of 100</b>
        </span>
      </div>
      <div className={`map-health ${critical ? "needs-attention" : ""}`}>
        <span />
        {critical
          ? `${critical} critical indicator${critical > 1 ? "s" : ""} · needs attention`
          : "All indicators above critical level"}
      </div>
      <div className="map-info-indicators">
        {INDICATOR_IDS.map((key) => {
          const value = district.indicators[key];
          return (
            <div className="map-info-indicator" key={key}>
              <div>
                <span>
                  {key} · {INDICATOR_LABELS[key]}
                </span>
                <strong>
                  {value < 40 && <small>Critical</small>}
                  {value}
                </strong>
              </div>
              <div
                className={`map-info-track ${value < 40 ? "is-critical" : ""}`}
              >
                <span style={{ width: `${value}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      <button className="map-focus-button" onClick={onFocus}>
        Explore {district.name} in 3D <ArrowUpRight size={17} />
      </button>
      <p className="map-data-note">
        Supplied synthetic dataset ·{" "}
        {(district.populationShare * 100).toFixed(0)}% of city population
      </p>
    </aside>
  );
}
