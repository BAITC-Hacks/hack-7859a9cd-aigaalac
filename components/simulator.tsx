"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CATEGORIES, HORIZON_QUARTERS, METRIC_KEYS, TOTAL_BUDGET, createSnapshot, previewDecisions, validateSelection } from "@/lib/score";
import { CATEGORY_LABELS, METRIC_LABELS } from "@/lib/labels";
import type { Action, AnalyzeResponse, Decision, District, MetricKey } from "@/lib/types";
import { CityArt } from "./city-art";
import { CityView } from "./city-view";
import workspaceStyles from "./simulator-workspace.module.css";
import { DistrictExplorer } from "./district-explorer";
import { ScenarioComparison } from "./scenario-comparison";
import { Icon } from "./icon";

const fixed = (value: number) => value.toFixed(2);
const units = (value: number) => `${value} бірлік`;

export function Simulator({ districts, actions }: { districts: District[]; actions: Action[] }) {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [response, setResponse] = useState<AnalyzeResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [focusedDistrictId, setFocusedDistrictId] = useState<string | null>(null);
  const [selectionVersion, setSelectionVersion] = useState(0);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const livePanelRef = useRef<HTMLElement>(null);
  const submitting = useRef(false);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const validation = useMemo(() => validateSelection(decisions, actions, districts), [decisions, actions, districts]);
  const baseline = createSnapshot(districts);
  const preview = useMemo(() => previewDecisions(districts, actions, decisions), [districts, actions, decisions]);
  const previewError = validation.issues.filter((issue) => issue.code !== "DECISION_COUNT" && issue.code !== "CATEGORY_REQUIRED").map((issue) => issue.message).join(" ");
  const reason = validation.valid ? "Барлығы дайын. Бес шешімді растаңыз." : validation.issues.map((issue) => issue.message).join(" ");
  const invalidPreview = previewError || (decisions.length > 5 ? "Дәл бес бастама қалдырыңыз. Болжам есептелмеді." : "");
  // Keep in-page navigation and focused controls below the mobile sticky city.
  useEffect(() => {
    const workspace = workspaceRef.current;
    const panel = livePanelRef.current;
    if (!workspace || !panel) return;
    const update = () => workspace.style.setProperty("--live-panel-height", `${panel.getBoundingClientRect().height}px`);
    const observer = new ResizeObserver(update);
    observer.observe(panel);
    update();
    return () => observer.disconnect();
  }, [response]);

  function blockedReason(action: Action): string {
    if (decisions.some((decision) => decision.actionId === action.id)) return "";
    if (validation.categoryCounts[action.category] > 0) return "Ауыстыру үшін осы бағыттағы таңдалған бастаманы алып тастаңыз.";
    if (action.cost > validation.remainingBudget) return `Тағы ${action.cost - validation.remainingBudget} бірлік қажет.`;
    return "";
  }

  function editPlan(plan: Decision[] = decisions) {
    setDecisions(plan.map((decision) => ({ ...decision })));
    setResponse(null);
    setError("");
    setFocusedDistrictId(null);
    setSelectionVersion((version) => version + 1);
    requestAnimationFrame(() => document.getElementById("decisions")?.scrollIntoView({ block: "start" }));
  }

  function toggleAction(action: Action) {
    if (busy || blockedReason(action)) return;
    const assignedDistrict = decisions.find((decision) => decision.actionId === action.id)?.districtId;
    setFocusedDistrictId(action.scope === "city" ? null : assignedDistrict ?? null);
    setSelectionVersion((version) => version + 1);
    setDecisions((current) => current.some((decision) => decision.actionId === action.id)
      ? current.filter((decision) => decision.actionId !== action.id)
      : [...current, { actionId: action.id }]);
    setError("");
  }

  function assignDistrict(actionId: string, districtId: string) {
    setFocusedDistrictId(districtId || null);
    setSelectionVersion((version) => version + 1);
    setDecisions((current) => current.map((decision) => decision.actionId === actionId
      ? { actionId, ...(districtId ? { districtId } : {}) } : decision));
    setError("");
  }

  async function submit() {
    if (!validation.valid || submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      const request = await fetch("/api/analyze", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decisions }), signal: AbortSignal.timeout(50_000),
      });
      const data = await request.json();
      if (!request.ok) throw new Error(data.error || "Сұрауды орындау мүмкін болмады.");
      setResponse(data as AnalyzeResponse);
      requestAnimationFrame(() => { resultHeading.current?.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: "auto" }); });
    } catch (cause) {
      setError(cause instanceof Error && cause.name !== "TimeoutError" ? cause.message : "Сұрау уақыты аяқталды. Қайта байқап көріңіз.");
    } finally { submitting.current = false; setBusy(false); }
  }

  function restart() { setDecisions([]); setResponse(null); setError(""); setFocusedDistrictId(null); window.scrollTo({ top: 0, behavior: "auto" }); }

  return <>
    <a href="#main" className="skip-link">Негізгі мазмұнға өту</a>
    <header className="site-header"><div className="shell header-inner">
      <a className="brand" href="/" aria-label="5 сағатқа әкім — басты бет"><span className="brand-mark">5<span>с</span></span><span>сағатқа <strong>әкім</strong><small>ҚАЛАНЫҢ ЕРТЕҢІН ТАҢДА</small></span></a>
      <div className="header-right"><span className="city-label"><span className="status-dot" /> Астана, Қазақстан</span><a className="help-link" href="#how-it-works">Қалай жұмыс істейді <span>↗</span></a></div>
    </div></header>
    <main id="main" className="shell">
      {!response ? <>
        <section className="hero">
          <div className="hero-copy"><div className="eyebrow"><span className="tiny-line" /> ҚАЛАНЫ БАСҚАРУ СИМУЛЯТОРЫ</div>
            <h1>Бес сағатқа әкім.<br /><span>Өз қалаңды өзгерт.</span></h1>
            <p>Қай ауданға қандай өзгеріс қажет? Ортақ бюджеттен бес бастамаға қаржы бөліп, екі шартты жылдағы нәтижені көріңіз.</p>
            <div className="hero-facts"><span><strong>100 бірлік</strong> бюджет</span><span><strong>5 шешім</strong> · 5 аудан</span><span><Icon name="spark" size={16} /> AI талдауы</span></div>
          </div>
          <div className="city-panel"><div className="city-panel-top"><span><span className="status-dot" /> АСТАНА, БҮГІН</span><span>Бастапқы жағдай</span></div><CityArt /><div className="city-panel-bottom"><div><span className="muted">Қаланың өмір сапасы</span><div className="baseline-value">{fixed(baseline.score)} <span>ұпай</span></div></div><span className="district-count">{districts.length} аудан · 10 көрсеткіш<br /><strong>Бір ортақ болашақ</strong></span></div></div>
        </section>
        <div className="workspace-heading" id="decisions"><div><span className="eyebrow">01 / ШЕШІМ ҚАБЫЛДАУ</span><h2>Қалаға не қажет?</h2></div><span className="step-note">14 бастамадан дәл 5 шешім</span></div>
        <p className="action-impact-note">Әр бағыттан дәл бір бастама. Аудандық бастама үшін бір аудан таңдаңыз. Көрсетілген әсер 8 тоқсанда іске асатын үлесті ескереді.</p>
        <details className="compatibility-guide"><summary>Бастамалардың үйлесімі</summary><div className="compatibility-columns"><div><h3>Бірге таңдасаңыз — қосымша әсер</h3><ul><li>M10 жарық пен камера + M12 өтініш платформасы: M10 ауданында көше қауіпсіздігі +2.</li></ul></div><div><h3>Бірге қабылдауға болмайды</h3><ul><li>Бір бағыттағы жобалардың біреуін ғана таңдауға болады.</li><li>M4 саябақ және M7 мектеп-балабақша: бір ауданда жер теліміне таласады.</li><li>M5 таза отын және M13 желілерді жаңарту: бір ауданда бағдарламалар қайталанады.</li></ul></div></div></details>
        <div className={workspaceStyles.workspace} ref={workspaceRef} data-testid="live-workspace">
          <aside className={workspaceStyles.livePanel} ref={livePanelRef} aria-label="Қаладағы тікелей өзгерістер мен бюджет" data-testid="live-city-panel">
            <CityView before={districts} after={preview?.districts ?? districts} actions={preview?.selectedActions ?? []} mode="preview" variant="docked" selectionVersion={selectionVersion} selectedCount={decisions.length} previewError={invalidPreview} focusedDistrictId={focusedDistrictId} onDistrictSelect={setFocusedDistrictId} />
            <section className={`${workspaceStyles.liveBudget} ${validation.overBudgetBy ? workspaceStyles.overBudget : ""}`} aria-label="Бюджет және таңдау қорытындысы" data-testid="city-live-budget">
              <div className={workspaceStyles.budgetNumbers}>
                <span>Ортақ бюджет <strong>100 <small>бірлік</small></strong></span>
                <span>Жұмсалды <strong>{validation.totalCost}</strong></span>
                <span>{validation.overBudgetBy ? "Жетпейді" : "Қалды"}<strong>{validation.overBudgetBy || validation.remainingBudget}</strong></span>
              </div>
              <div className={workspaceStyles.budgetTrack} role="progressbar" aria-label="Бюджеттің жұмсалған бөлігі" aria-valuenow={Math.min(100, validation.totalCost / TOTAL_BUDGET * 100)} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${Math.min(100, validation.totalCost / TOTAL_BUDGET * 100)}%` }} /></div>
              <div className={workspaceStyles.submitRow}>
                <div><span className={workspaceStyles.decisionCount}>{decisions.length} / 5 шешім</span><p id="selection-reason" aria-live="polite">{busy ? "Көрсеткіштер есептеліп, AI түсіндірмесі дайындалуда." : reason}</p></div>
                <button className="confirm-button" onClick={submit} disabled={!validation.valid || busy} aria-describedby="selection-reason">{busy ? <><span className="spinner" /> Талдануда…</> : <>Растау <Icon name="arrow" size={17} /></>}</button>
              </div>
              {error && <p role="alert" className="request-error">{error}</p>}
            </section>
          </aside>
          <div className={`choices ${workspaceStyles.choices}`}>
            <p className={workspaceStyles.liveInstruction}><span /> Таңдаңыз — қаладағы өзгерісті бірден көріңіз.</p>
          <nav className="category-nav" aria-label="Бағыттарға өту">{CATEGORIES.map((category) => <a key={category} href={`#${category}`} className={validation.categoryCounts[category] ? "done" : ""}><Icon name={category} size={17} />{CATEGORY_LABELS[category]}<span>{validation.categoryCounts[category]}/1</span></a>)}</nav>
          {CATEGORIES.map((category, index) => <fieldset key={category} id={category} className="category-section" disabled={busy}>
            <legend><span className={`category-icon ${category}`}><Icon name={category} /></span><span>{CATEGORY_LABELS[category]}<small>Осы бағыттан {validation.categoryCounts[category]} / 1 бастама таңдалды</small></span><span className="category-number">0{index + 1}</span></legend>
            <div className="action-grid catalog-grid">{actions.filter((action) => action.category === category).map((action) => {
              const decision = decisions.find((item) => item.actionId === action.id);
              const selected = Boolean(decision);
              const blocked = blockedReason(action);
              const realizedShare = (HORIZON_QUARTERS - action.lag) / HORIZON_QUARTERS;
              return <article id={`action-card-${action.id}`} className={`action-card ${selected ? "selected" : ""}`} key={action.id} data-testid={`action-${action.id}`}>
                <label className="action-toggle"><span className="action-top"><span className="action-price">{units(action.cost)}</span><input type="checkbox" checked={selected} disabled={Boolean(blocked)} aria-describedby={blocked ? `blocked-${action.id}` : undefined} onChange={() => toggleAction(action)} aria-label={action.title} /></span><h3>{action.title}</h3></label>
                <div className="action-scope"><span>{action.id}</span><span>{action.scope === "city" ? "Бүкіл қалаға" : "Бір ауданға"}</span></div>
                <p>{action.description}</p>
                {blocked && <p className="action-blocked" id={`blocked-${action.id}`}>{blocked}</p>}
                <div className="action-timing"><span>{action.lag} тоқсаннан кейін</span><strong>{realizedShare * 100}% әсер</strong></div>
                <div className="impacts">{Object.entries(action.impact).map(([key, value]) => <span className={value < 0 ? "negative" : "positive"} key={key} title={`Толық әсер: ${value > 0 ? "+" : ""}${value}`}>{value > 0 ? "+" : ""}{Number((value * realizedShare).toFixed(3))} <span>{METRIC_LABELS[key as MetricKey]}</span></span>)}</div>
                {selected && action.scope === "district" && <label className="district-assignment" htmlFor={`district-select-${action.id}`}><span>Қай ауданға бағыттаймыз?</span><select id={`district-select-${action.id}`} data-testid={`district-select-${action.id}`} value={decision?.districtId ?? ""} onChange={(event) => assignDistrict(action.id, event.target.value)} required aria-invalid={!decision?.districtId}><option value="">Ауданды таңдаңыз</option>{districts.map((district) => <option key={district.id} value={district.id}>{district.name}</option>)}</select></label>}
                {selected && action.scope === "city" && <div className="action-city-note"><Icon name="check" size={13} /> Бес ауданның бәріне әсер етеді</div>}
                {selected && <span className={workspaceStyles.liveHint}><Icon name="spark" size={13} />{invalidPreview ? "Өзгерісті көру үшін таңдауды толықтырыңыз" : "Өзгеріс қасындағы 3D көріністе"}</span>}
              </article>;
            })}</div>
          </fieldset>)}
        </div></div>
        <DistrictExplorer before={districts} after={preview?.districts ?? districts} actions={preview?.selectedActions ?? []} mode="preview" selectedCount={decisions.length} previewError={invalidPreview} activeDistrictId={focusedDistrictId} onDistrictSelect={setFocusedDistrictId} />
      </> : <section className="results" aria-busy={busy}>
        <div className="results-heading"><div><div className="eyebrow">02 / СІЗДІҢ ҚАЛАҢЫЗДЫҢ БОЛАШАҒЫ</div><h1 ref={resultHeading} tabIndex={-1}>Шешім қабылданды.<br /><span>Қала қалай өзгерді?</span></h1></div><div className="result-actions"><button className="secondary-button" onClick={() => editPlan()} disabled={busy}>Жоспарды өзгерту</button><button className="secondary-button" onClick={restart} disabled={busy}><Icon name="reset" size={18} /> Қайта бастау</button></div></div>
        <div className="result-top-grid"><div className="score-card"><span className="eyebrow">ASTANA QUALITY OF LIFE SCORE</span><div className="final-score" data-testid="final-score">{fixed(response.result.after.score)}<span>ұпай</span></div><span className="score-change">{response.result.scoreChange >= 0 ? "+" : ""}{fixed(response.result.scoreChange)} ұпай</span><p>Бастапқы көрсеткіш: {fixed(response.result.before.score)} ұпай</p><div className="score-foot">8 тоқсан. Бес аудан. Сіздің шешіміңіз.</div></div>
          <div className="metrics-card"><div className="card-heading"><h2>Қаланың он көрсеткіші</h2><div className="chart-legend"><span>Бұрын</span><span>Кейін</span></div></div>{METRIC_KEYS.map((key) => <div className="metric-row" key={key}><div><span>{METRIC_LABELS[key]}</span><span className="metric-values">{fixed(response.result.before.averageMetrics[key])} <span>→</span> <strong>{fixed(response.result.after.averageMetrics[key])}</strong></span></div><div className="metric-track" aria-hidden="true"><span className="before-bar" style={{ width: `${response.result.before.averageMetrics[key]}%` }} /></div><div className="metric-track" aria-hidden="true"><span className="after-bar" style={{ width: `${response.result.after.averageMetrics[key]}%` }} /></div></div>)}<p className="metrics-footnote">Орташа мән тұрғындар үлесімен өлшенген.</p></div>
        </div>
        <CityView before={response.result.before.districts} after={response.result.after.districts} actions={response.result.selectedActions} mode="result" focusedDistrictId={focusedDistrictId} onDistrictSelect={setFocusedDistrictId} />
        <DistrictExplorer before={response.result.before.districts} after={response.result.after.districts} actions={response.result.selectedActions} mode="result" activeDistrictId={focusedDistrictId} onDistrictSelect={setFocusedDistrictId} />
        <div className="result-bottom-grid"><div className="ai-card"><div className="card-heading"><h2><Icon name="spark" /> AI кеңесшінің талдауы</h2><span className="ai-label">AI ТАЛДАУЫ</span></div>
          {response.analysis.status === "complete" ? <div className="analysis-sections">{([
            ["Күшті жақтары", response.analysis.explanation.strengths, "strengths"],
            ["Тәуекелдер мен ымыралар", response.analysis.explanation.tradeoffs, "tradeoffs"],
            ["Келесі қадамға ұсыныстар", response.analysis.explanation.recommendations, "recommendations"],
          ] as const).map(([title, items, key]) => <section key={key} className={`analysis-section ${key}`}><h3>{title}</h3><ul>{items.map((item, index) => <li key={index}>{item}</li>)}</ul></section>)}</div>
            : <div className="ai-unavailable"><Icon name="spark" size={32} /><h3>Есеп дайын, талдау күтілуде</h3><p>{response.analysis.message}</p><button className="secondary-button" onClick={submit} disabled={busy}>{busy ? <><span className="spinner" /> Талданып жатыр…</> : "AI талдауын қайталау"}</button></div>}
          {error && <p role="alert" className="inline-error">{error}</p>}<p className="ai-footnote">AI есептелген нәтижені түсіндіреді. Ұпай, әсер және үйлесімдер бекітілген формуламен есептеледі.</p>
        </div><aside className="plan-card"><span className="eyebrow">БЕКІТІЛГЕН ЖОСПАР</span><h2>Сіздің бес шешіміңіз</h2><ul>{response.result.selectedActions.map((action) => <li key={action.id}><span className={`category-icon ${action.category}`}><Icon name={action.category} size={19} /></span><div><strong>{action.title}</strong><span>{action.scope === "city" ? "Бүкіл қала" : districts.find((district) => district.id === action.districtId)?.name} · {units(action.cost)}</span><span>{action.lag} тоқсаннан кейін · {(HORIZON_QUARTERS - action.lag) / HORIZON_QUARTERS * 100}% әсер</span></div></li>)}</ul><div className="plan-total"><span>Барлық шығын</span><strong>{units(response.result.totalCost)}</strong></div><div className="plan-remaining"><span>Қалған бюджет</span><strong>{units(response.result.remainingBudget)}</strong></div></aside></div>
      </section>}
      <ScenarioComparison districts={districts} actions={actions} current={response?.result ?? null} busy={busy} onEdit={editPlan} />
      <section className="how-it-works" id="how-it-works"><div><span className="eyebrow">ҚАРАПАЙЫМ ҚАҒИДАЛАР</span><h2>Үлкен өзгеріс дәл таңдаудан басталады.</h2></div><div className="how-steps"><div><span>01</span><h3>Бес бастама таңдаңыз</h3><p>Әр бағыттан дәл бір бастама. Аудандық шешімді нақты ауданға бағыттаңыз.</p></div><div><span>02</span><h3>Бюджет пен үйлесімді тексеріңіз</h3><p>100 бірліктен аспаңыз. Үйлеспейтін бастамаларды бірге қабылдауға болмайды.</p></div><div><span>03</span><h3>Қаланың нәтижесін бағалаңыз</h3><p>Орташа өмір сапасы, ең әлсіз аудан және 40-тан төмен көрсеткіштер бірге есептеледі.</p></div></div></section>
    </main><footer className="shell site-footer"><span>© 2026 · 5 сағатқа әкім</span><span>Синтетикалық деректер <span className="footer-dot">·</span> Нақты қалалық болжам емес</span></footer>
  </>;
}
