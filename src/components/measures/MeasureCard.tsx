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
  Wrench,
} from "lucide-react";
import type { Decision, Measure } from "@/types";
import DistrictSelector from "./DistrictSelector";
const icons = {
  Transport: BusFront,
  Environment: Leaf,
  Social: HeartPulse,
  Infrastructure: Wrench,
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
    <article className={`measure-card ${selected ? "is-added" : ""}`}>
      <div className="measure-top">
        <span
          className={`category-icon category-${measure.category.toLowerCase()}`}
        >
          <Icon size={21} />
        </span>
        <span className="category-label">{measure.category}</span>
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
          {measure.lag} lag
        </span>
        <span>
          <Globe2 size={13} />
          {measure.scope === "city" ? "City-wide" : "District initiative"}
        </span>
      </div>
      <div className="effects">
        {measure.effects.map((effect) => (
          <span key={effect}>{effect}</span>
        ))}
      </div>
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
