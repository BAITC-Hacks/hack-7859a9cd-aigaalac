"use client";
import { useState } from "react";
import {
  BusFront,
  Check,
  Clock3,
  Globe2,
  HeartPulse,
  Leaf,
  Plus,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import type { Decision, Measure } from "@/types";
import DistrictSelector from "./DistrictSelector";
import { HORIZON_QUARTERS } from "@/data/districts";
import { INDICATOR_LABELS } from "@/data/indicators";
import type { IndicatorId } from "@/types";
const icons = {
  Transport: BusFront,
  Environment: Leaf,
  Social: HeartPulse,
  Safety: ShieldCheck,
  Services: Wrench,
};
export default function MeasureCard({
  measure,
  selectedDecision,
  remaining,
  atLimit,
  busy,
  onAdd,
}: {
  measure: Measure;
  selectedDecision?: Decision;
  remaining: number;
  atLimit: boolean;
  busy: boolean;
  onAdd: (decision: Decision) => void;
}) {
  const [districtId, setDistrictId] = useState("");
  const selected = !!selectedDecision;
  const Icon = icons[measure.category];
  const overBudget = measure.cost > remaining;
  const disabled =
    busy ||
    selected ||
    atLimit ||
    overBudget ||
    (measure.scope === "district" && !districtId);
  const label = selected
    ? "Added to strategy"
    : atLimit
      ? "5 decisions selected"
      : overBudget
        ? "Insufficient budget"
        : "Add to strategy";
  return (
    <article
      data-measure-id={measure.id}
      className={`measure-card ${selected ? "is-added" : ""}`}
    >
      <div className="measure-top">
        <span
          className={`category-icon category-${measure.category.toLowerCase()}`}
        >
          <Icon size={21} />
        </span>
        <span className="category-label">
          {measure.id} · {measure.category}
        </span>
        <span className="measure-cost">
          {measure.cost}
          <span> credits</span>
        </span>
      </div>
      <h3>{measure.name}</h3>
      <p className="measure-description">{measure.description}</p>
      <div className="measure-meta">
        <span>
          <Clock3 size={13} />
          {measure.lag} quarter{measure.lag === 1 ? "" : "s"} lag
        </span>
        <span>
          <Globe2 size={13} />
          {measure.scope === "city" ? "City-wide" : "District initiative"}
        </span>
      </div>
      <div className="effects">
        {Object.entries(measure.effects).map(([key, effect]) => (
          <span key={key} title={INDICATOR_LABELS[key as IndicatorId]}>
            {key} {effect >= 0 ? "+" : ""}
            {effect}
          </span>
        ))}
      </div>
      <p className="small muted">
        Full effects above ·{" "}
        {((HORIZON_QUARTERS - measure.lag) / HORIZON_QUARTERS) * 100}% realized
        over {HORIZON_QUARTERS} quarters.
      </p>
      <div className="measure-actions">
        {measure.scope === "district" ? (
          <DistrictSelector
            id={`district-${measure.id}`}
            value={selectedDecision?.districtId ?? districtId}
            onChange={setDistrictId}
            disabled={selected || busy}
          />
        ) : (
          <div className="city-wide-note">
            <Globe2 size={17} /> Applies to all five districts
          </div>
        )}
        <button
          className={`button button-add ${selected ? "added" : ""}`}
          disabled={disabled}
          onClick={() =>
            onAdd({
              measureId: measure.id,
              districtId: measure.scope === "city" ? null : districtId,
            })
          }
        >
          {selected ? <Check size={16} /> : <Plus size={16} />} {label}
        </button>
      </div>
    </article>
  );
}
