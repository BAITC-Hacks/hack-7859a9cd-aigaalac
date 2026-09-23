"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChartNoAxesCombined, Coins, Layers3, Search } from "lucide-react";
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
import { validateDecisions } from "@/lib/simulation/validator";
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
      `${m.name} ${m.description}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  function add(decision: Decision) {
    if (!ready || busy) return;
    const next = [...decisions, decision];
    const validation = validateDecisions(next, { requireComplete: false });
    if (!validation.valid) {
      setError(validation.errors.join(" "));
      return;
    }
    setDecisions(next);
    setError(null);
  }
  async function run() {
    if (busy || !ready) return;
    const validation = validateDecisions(decisions);
    if (!validation.valid) {
      setError(validation.errors.join(" "));
      return;
    }
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
    <div className="page-content simulation-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">Аким на 5 часов</div>
          <h1>City management</h1>
          <p>
            Choose exactly {DECISION_LIMIT} initiatives within {CITY_BUDGET}{" "}
            credits. Every initiative has a fixed cost.
          </p>
        </div>
      </div>

      <div className="game-guide">
        <div className="game-guide-number">?</div>

        <div>
          <strong>Как управлять городом?</strong>
          <p>
            У вас есть 100 единиц бюджета и 5 решений.
            Изучите районы, выберите инициативы и укажите,
            где их реализовать. После пяти решений запустите симуляцию.
          </p>
        </div>
      </div>

      <div className="section-heading compact">
        <h2>
          <span className="step-label">1</span> Выберите район
        </h2>

        <span className="muted small">
          Нажмите на район, чтобы посмотреть его показатели
        </span>
      </div>
      <div className="stats-grid dashboard-stats">
        <StatCard
          label="Budget remaining"
          value={CITY_BUDGET - spent}
          suffix={`/ ${CITY_BUDGET} credits`}
          detail={`${spent} credits allocated to your strategy`}
          icon={Coins}
        />
        <StatCard
          label="Decisions selected"
          value={decisions.length}
          suffix={`/ ${DECISION_LIMIT}`}
          detail="Choose exactly five initiatives"
          icon={Layers3}
        />
        <StatCard
          label="Current quality of life"
          value={INITIAL_QOL.toFixed(2)}
          suffix="/ 100"
          detail="Demo city-wide baseline"
          icon={ChartNoAxesCombined}
          accent
        />
      </div>



      <div className="dashboard-layout">
        <div className="dashboard-main">
          <section>
            <div className="section-heading compact">
              <h2>
                <span className="step-label">1</span> Inspect districts
              </h2>
              <span className="muted small">Select a district to explore</span>
            </div>
            <div
              className="district-grid"
              role="group"
              aria-label="District navigation"
            >
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
                <h2>
                  <span className="step-label">2</span> Выберите инициативы
                </h2>

                <p>
                  Выберите инициативу и район, где хотите её реализовать.
                  Стоимость автоматически вычитается из бюджета.
                </p>
              </div>
            </div>
            <div className="catalog-toolbar">
              <div
                className="filter-tabs"
                role="group"
                aria-label="Filter initiatives"
              >
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
              <span>Full effects before implementation lag</span>
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
            busy={busy}
            restoring={!ready}
            error={error}
            onRemove={(i) => {
              if (!ready || busy) return;
              setDecisions(decisions.filter((_, index) => index !== i));
              setError(null);
            }}
            onRun={run}
          />
        </div>
      </div>
    </div>
  );
}
