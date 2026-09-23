"use client";

import { useEffect, useMemo, useState } from "react";
import { simulateDecisions, validateSelection } from "@/lib/score";
import { CATEGORY_LABELS } from "@/lib/labels";
import type { Action, Decision, District, SimulationResult } from "@/lib/types";

export const SCENARIO_STORAGE_KEY = "akim-scenarios-five-directions-v1";
const SLOTS = ["A", "B"] as const;
type Plans = [Decision[] | null, Decision[] | null];
const fixed = (value: number) => value.toFixed(2);
const signed = (value: number) => `${value > 0 ? "+" : ""}${fixed(value)}`;

function decisionsOf(result: SimulationResult): Decision[] {
  return result.selectedActions.map(({ id, districtId }) => ({ actionId: id, ...(districtId ? { districtId } : {}) }));
}

export function ScenarioComparison({ districts, actions, current, busy, onEdit }: {
  districts: District[];
  actions: Action[];
  current: SimulationResult | null;
  busy: boolean;
  onEdit: (plan: Decision[]) => void;
}) {
  const [plans, setPlans] = useState<Plans>([null, null]);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SCENARIO_STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed) || parsed.length !== 2) throw new Error("Invalid saved plans");
        let rejected = false;
        const restored = parsed.map((plan) => {
          if (plan === null) return null;
          const validation = validateSelection(plan, actions, districts);
          if (!validation.valid) { rejected = true; return null; }
          return decisionsOf(simulateDecisions(districts, actions, plan));
        }) as Plans;
        setPlans(restored);
        if (rejected) setMessage("Қазіргі ережелерге сай келмейтін сақталған жоспар ашылмады.");
      }
    } catch {
      setMessage("Браузердегі жоспарларды оқу мүмкін болмады. Осы бетте салыстыруды жалғастыра аласыз.");
    } finally { setReady(true); }
  }, [districts, actions]);

  // Store only choices. All scores use the current trusted catalog and baseline.
  const results = useMemo(() => plans.map((plan) => plan ? simulateDecisions(districts, actions, plan) : null), [plans, districts, actions]);

  function updateSlot(index: number, plan: Decision[] | null) {
    const next = [...plans] as Plans;
    next[index] = plan;
    setPlans(next);
    try {
      localStorage.setItem(SCENARIO_STORAGE_KEY, JSON.stringify(next));
      setMessage(`${SLOTS[index]} сценарийі ${plan ? "браузерде сақталды" : "өшірілді"}.`);
    } catch {
      setMessage("Өзгеріс осы бетте сақталды. Браузер жады қолжетімсіз: бетті жаңартсаңыз, ол жоғалады.");
    }
  }

  const [a, b] = results;
  return <section className="scenario-comparison" aria-labelledby="comparison-heading" data-testid="scenario-comparison">
    <div className="card-heading"><h2 id="comparison-heading">Сценарийлерді салыстыру</h2><span className="eyebrow">A / B</span></div>
    <p className="comparison-note">Нәтижені A немесе B ұяшығына сақтап, жоспарды өзгертіңіз. Екі сценарий де бірдей бастапқы қала мен 100 бірлік бюджет бойынша есептеледі. Жоспарлар осы браузерде сақталады.</p>
    <div className="scenario-slots">
      {SLOTS.map((slot, index) => {
        const result = results[index];
        return <article className="scenario-slot" key={slot} data-testid={`scenario-${slot}`}>
          <h3>{slot} сценарийі</h3>
          {result ? <>
            <p className="scenario-score"><strong data-testid={`scenario-score-${slot}`}>{fixed(result.after.score)}</strong> ұпай <span>({signed(result.scoreChange)})</span></p>
            <p>Жұмсалды: <strong>{result.totalCost}</strong> · Қалды: <strong>{result.remainingBudget}</strong></p>
            <ul>{result.selectedActions.map((action) => <li key={action.id}><small>{CATEGORY_LABELS[action.category]}</small>{action.title}<span>{action.scope === "city" ? "Бүкіл қала" : districts.find((district) => district.id === action.districtId)?.name} · {action.cost} бірлік</span></li>)}</ul>
          </> : <p className="comparison-note">Бес шешімді растағаннан кейін нәтижені осы ұяшыққа сақтай аласыз.</p>}
          <div className="scenario-controls">
            <button className="secondary-button" disabled={!ready || !current || busy} onClick={() => current && updateSlot(index, decisionsOf(current))}>{slot}: {result ? "нәтижемен ауыстыру" : "нәтижені сақтау"}</button>
            {result && <>
              <button className="secondary-button" disabled={busy} onClick={() => onEdit(decisionsOf(result))}>{slot}: жоспарды ашу</button>
              <button className="secondary-button" disabled={busy} onClick={() => updateSlot(index, null)}>{slot}: өшіру</button>
            </>}
          </div>
        </article>;
      })}
    </div>
    {a && b && <div className="comparison-table-wrap" role="region" aria-label="Екі сценарийдің көрсеткіштері" tabIndex={0}>
      <table className="comparison-table">
        <caption>B сценарийінің A сценарийінен айырмасы</caption>
        <thead><tr><th scope="col">Көрсеткіш</th><th scope="col">A</th><th scope="col">B</th><th scope="col">B − A</th></tr></thead>
        <tbody>
          <tr><th scope="row">Қаланың Score көрсеткіші</th><td>{fixed(a.after.score)}</td><td>{fixed(b.after.score)}</td><td data-testid="comparison-score-difference">{signed(b.after.score - a.after.score)}</td></tr>
          <tr><th scope="row">Жұмсалған бюджет</th><td>{a.totalCost}</td><td>{b.totalCost}</td><td>{signed(b.totalCost - a.totalCost)}</td></tr>
          <tr><th scope="row">Қалған бюджет</th><td>{a.remainingBudget}</td><td>{b.remainingBudget}</td><td>{signed(b.remainingBudget - a.remainingBudget)}</td></tr>
          <tr><th scope="row">Критикалық көрсеткіштер саны</th><td>{a.after.criticalCount}</td><td>{b.after.criticalCount}</td><td>{signed(b.after.criticalCount - a.after.criticalCount)}</td></tr>
          {districts.map((district) => <tr key={district.id}><th scope="row">{district.name} · аудан ұпайы</th><td>{fixed(a.after.districtScores[district.id])}</td><td>{fixed(b.after.districtScores[district.id])}</td><td>{signed(b.after.districtScores[district.id] - a.after.districtScores[district.id])}</td></tr>)}
        </tbody>
      </table>
      <p className="comparison-note">Score пен аудан ұпайы жоғары болғаны жақсы; критикалық көрсеткіштер саны аз болғаны жақсы. Қалған бюджет өздігінен ұпай қоспайды.</p>
    </div>}
    <p role="status" className="comparison-note">{message}</p>
  </section>;
}
