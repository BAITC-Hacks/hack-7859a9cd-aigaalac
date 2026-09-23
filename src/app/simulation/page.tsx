"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChartNoAxesCombined,
  Coins,
  Layers3,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import AstanaMap from "@/components/map/AstanaMap";
import { StatCard } from "@/components/ui/StatCard";
import DistrictCard from "@/components/districts/DistrictCard";
import DistrictDetails from "@/components/districts/DistrictDetails";
import MeasureCard from "@/components/measures/MeasureCard";
import StrategyPanel from "@/components/strategy/StrategyPanel";
import { useSimulation } from "@/components/SimulationProvider";
import {
  CITY_BUDGET,
  DECISION_LIMIT,
  INITIAL_QOL,
  districts,
} from "@/data/districts";
import { categories, measures } from "@/data/measures";
import { simulateStrategy } from "@/lib/api/simulation";
import { USE_MOCK_API } from "@/lib/api/client";
import type { Category, Decision } from "@/types";
export default function SimulationPage() {
  const router = useRouter();
  const { decisions, setDecisions, setResult, ready } = useSimulation();
  const [districtId, setDistrictId] = useState("nura");
  const [category, setCategory] = useState<Category | "All initiatives">(
    "All initiatives",
  );
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const spent = decisions.reduce(
    (sum, d) => sum + (measures.find((m) => m.id === d.measureId)?.cost ?? 0),
    0,
  );
  const district = districts.find((d) => d.id === districtId)!;
  const filtered = measures.filter(
    (m) =>
      (category === "All initiatives" || m.category === category) &&
      `${m.name} ${m.description}`.toLowerCase().includes(query.toLowerCase()),
  );
  function add(decision: Decision) {
    const measure = measures.find((m) => m.id === decision.measureId);
    if (
      !ready ||
      busy ||
      !measure ||
      decisions.length >= DECISION_LIMIT ||
      spent + measure.cost > CITY_BUDGET ||
      decisions.some((d) => d.measureId === decision.measureId)
    )
      return;
    if (
      measure.scope === "district" &&
      !districts.some((d) => d.id === decision.districtId)
    )
      return;
    setDecisions([
      ...decisions,
      {
        measureId: measure.id,
        districtId: measure.scope === "city" ? null : decision.districtId,
      },
    ]);
    setError(null);
  }
  async function run() {
    if (busy || decisions.length !== DECISION_LIMIT || spent > CITY_BUDGET)
      return;
    setBusy(true);
    setError(null);
    try {
      const result = await simulateStrategy(decisions);
      setResult(result);
      router.push("/results");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Simulation failed. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <div className="eyebrow">THE CITY IS IN YOUR HANDS</div>
          <h1>City management</h1>
          <p>
            Understand the needs. Choose your initiatives. Build a better
            Astana.
          </p>
        </div>
        <span className="round-badge">
          ROUND 01 <span>/ 5 HOURS</span>
        </span>
      </div>
      <div className="stats-grid dashboard-stats">
        <StatCard
          label="Available budget"
          value={CITY_BUDGET - spent}
          suffix={`/ ${CITY_BUDGET} credits`}
          detail={`${spent} credits allocated to your strategy`}
          icon={Coins}
        />
        <StatCard
          label="Decisions selected"
          value={`0${decisions.length}`}
          suffix={`/ 0${DECISION_LIMIT}`}
          detail="Choose exactly five initiatives"
          icon={Layers3}
        />
        <StatCard
          label="Current quality of life"
          value={INITIAL_QOL}
          suffix="/ 100"
          detail="City-wide baseline before your decisions"
          icon={ChartNoAxesCombined}
          accent
        />
      </div>
      <AstanaMap
        selectedDistrictId={districtId}
        onDistrictSelect={setDistrictId}
      />
      <div className="dashboard-layout">
        <div className="dashboard-main">
          <section>
            <div className="section-heading compact">
              <h2>
                Your districts <span className="heading-count">05</span>
              </h2>
              <span className="muted small">Select a district to explore</span>
            </div>
            <div className="district-grid">
              {districts.map((d) => (
                <DistrictCard
                  key={d.id}
                  district={d}
                  selected={d.id === districtId}
                  onSelect={() => setDistrictId(d.id)}
                />
              ))}
            </div>
            <DistrictDetails district={district} />
          </section>
          <section className="catalog">
            <div className="section-heading compact">
              <div>
                <h2>Initiative catalog</h2>
                <p>Small actions. City-wide possibilities.</p>
              </div>
              <SlidersHorizontal size={20} className="muted" />
            </div>
            <div className="catalog-toolbar">
              <div className="filter-tabs" aria-label="Filter initiatives">
                {(["All initiatives", ...categories] as const).map((c) => (
                  <button
                    key={c}
                    className={category === c ? "active" : ""}
                    aria-pressed={category === c}
                    onClick={() => setCategory(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <label className="search-box">
                <Search size={16} />
                <input
                  aria-label="Search initiatives"
                  placeholder="Search initiatives…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
            </div>
            <div className="catalog-caption">
              <span>{filtered.length} initiatives available</span>
              <span>Effects shown are catalog estimates</span>
            </div>
            <div className="measure-grid">
              {filtered.map((m) => (
                <MeasureCard
                  key={m.id}
                  measure={m}
                  selectedDecision={decisions.find((d) => d.measureId === m.id)}
                  remaining={CITY_BUDGET - spent}
                  atLimit={decisions.length >= DECISION_LIMIT}
                  busy={busy || !ready}
                  onAdd={add}
                />
              ))}
            </div>
            {!filtered.length && (
              <div className="empty-state">
                <Search size={26} />
                <h3>No initiatives found</h3>
                <p>Try a different search or category.</p>
                <button
                  className="button button-secondary"
                  onClick={() => {
                    setQuery("");
                    setCategory("All initiatives");
                  }}
                >
                  Clear filters
                </button>
              </div>
            )}
          </section>
        </div>
        <div className="strategy-column">
          <StrategyPanel
            decisions={decisions}
            spent={spent}
            busy={busy || !ready}
            error={error}
            onRemove={(i) => {
              setDecisions(decisions.filter((_, index) => index !== i));
              setError(null);
            }}
            onRun={run}
          />
          {USE_MOCK_API && (
            <div className="demo-note">
              <span className="demo-dot" />
              <p>
                <strong>You’re in demo mode</strong>Results and analysis use a
                fixed example, independent of your selections.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
