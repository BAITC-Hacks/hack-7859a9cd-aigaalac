"use client";

import { useState } from "react";
import { buildDistrictReports, summarizeDistricts } from "@/lib/districts";
import { createSnapshot, METRIC_KEYS, METRIC_WEIGHTS } from "@/lib/score";
import { METRIC_LABELS as metricNames, METRIC_DESCRIPTIONS } from "@/lib/labels";
import type { SelectedAction, District, MetricKey } from "@/lib/types";
import { Icon } from "./icon";

const fixed = (value: number) => value.toFixed(2);
const signed = (value: number) => `${value > 0 ? "+" : ""}${fixed(value)}`;

function DistrictGlyph({ index }: { index: number }) {
  return (
    <svg
      viewBox="0 0 72 42"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="district-glyph"
      aria-hidden="true"
    >
      {index === 0 ? (
        <>
          <path d="M3 32c10-7 16 7 26 0s16 7 26 0 12-1 14 0M3 38c10-7 16 7 26 0s16 7 26 0 12-1 14 0" />
          <path d="M18 27V13m-5 8 5-5 5 5M10 16 18 3l8 13H10Zm31 11V13h14v14M45 18h1m5 0h1m-7 5h1m5 0h1" />
        </>
      ) : index === 1 ? (
        <>
          <path d="M3 36h66M9 35V14l10-7 10 7v21M15 21h8m-8 6h8m-4 8v-4M35 35V10h13v25M38 15h7m-7 6h7m-7 6h7M54 35V18h10v17m-7-11h4m-4 5h4" />
          <path d="M4 14 19 3l15 11" />
        </>
      ) : index === 2 ? (
        <>
          <path d="M3 36h66M9 36V9h18v27M13 14h3m6 0h1m-10 6h3m6 0h1m-10 6h3m6 0h1M33 36V3h16v33m-12-27h8m-8 7h8m-8 7h8m-8 7h8M56 36V17h10v19m-7-13h4m-4 6h4" />
          <path d="M14 6h8M37 0h8" />
        </>
      ) : (
        <>
          <path d="M3 36h66M10 30V14h12v16m-9-10h6m-6 5h6M30 30V6h16v24m-12-18h8m-8 6h8m-8 6h8M54 30V11h11v19m-8-13h5m-5 6h5" />
          <path d="M3 40h13m7 0h13m7 0h13m7 0h6M35 3h6" />
        </>
      )}
    </svg>
  );
}

export function DistrictExplorer({
  before,
  after,
  actions,
  mode,
  selectedCount = actions.length,
  previewError = "",
  activeDistrictId,
  onDistrictSelect,
}: {
  before: readonly District[];
  after: readonly District[];
  actions: readonly SelectedAction[];
  mode: "preview" | "result";
  selectedCount?: number;
  previewError?: string;
  activeDistrictId?: string | null;
  onDistrictSelect?: (id: string) => void;
}) {
  const [internalActiveId, setInternalActiveId] = useState(before[0]?.id ?? "");
  const activeId = activeDistrictId === undefined ? internalActiveId : activeDistrictId;
  const reports = buildDistrictReports(before, after, actions);
  const summary = summarizeDistricts(reports);
  const active = reports.find((district) => district.id === activeId) ?? reports[0];
  const isResult = mode === "result";
  const hasChanges = actions.length > 0 && !previewError;
  const showScenarioScore = isResult || (selectedCount === 5 && !previewError);
  const cityBefore = createSnapshot(before);
  const cityAfter = showScenarioScore ? createSnapshot(after) : null;
  const initialNeed = active.initialPriority;
  const remainingNeed = active.remainingPriority;
  const gapChange = summary.gapAfter - summary.gapBefore;
  const headingId = `district-heading-${mode}`;

  return (
    <section
      id={`district-${mode}`}
      className={`district-explorer ${mode}`}
      aria-labelledby={headingId}
      data-testid={`district-explorer-${mode}`}
    >
      <div className="district-explorer-heading">
        <div>
          <span className="eyebrow">
            {isResult ? "ӘР АУДАНДАҒЫ НӘТИЖЕ" : "00 / АУДАНДАРДЫ ТАНУ"}
          </span>
          <h2 id={headingId}>
            {isResult ? "Бір жоспар. Әртүрлі әсер." : "Бес аудан. Бес түрлі қажеттілік."}
          </h2>
          <p>
            {isResult
              ? "Қаланың қорытынды ұпайының артында әр ауданның өз өзгерісі бар."
              : "Ауданды таңдаңыз. Бастаманы қайда бағыттағаныңыз нәтижені өзгертеді."}
          </p>
        </div>
        <div
          className={`district-preview-status ${previewError ? "over-limit" : ""}`}
          data-testid="district-preview-status"
          aria-live="polite"
        >
          <strong>
            {previewError ? "Болжам есептелмеді" : isResult
              ? "Бекітілген 5 шешімнің нәтижесі"
              : `${selectedCount} / 5 шешім · алдын ала есеп`}
          </strong>
          {previewError
            ? `${previewError} Төменде бастапқы жағдай көрсетілген.`
            : isResult
              ? "Әр аудан үшін жеке есептелді"
              : hasChanges
                ? "Соңғы нәтиже бес шешімді растағаннан кейін шығады"
                : "Әзірге бастапқы жағдай көрсетілген"}
        </div>
      </div>

      <div className="district-selector" aria-label="Ауданды таңдау">
        {reports.map((district, index) => (
          <button
            key={district.id}
            type="button"
            className="district-card"
            aria-pressed={activeDistrictId !== null && active.id === district.id}
            aria-controls={`district-details-${mode}`}
            aria-label={`Ауданды қарау: ${district.name}`}
            data-testid={`district-card-${district.id}`}
            onClick={() => { setInternalActiveId(district.id); onDistrictSelect?.(district.id); }}
          >
            <span className="district-card-top">
              <span className="district-index">АУДАН / 0{index + 1}</span>
              <DistrictGlyph index={index} />
            </span>
            <strong className="district-card-name">{district.name}</strong>
            <span className="district-character">{district.character}</span>
            <span className="district-population">Тұрғындар үлесі: {Math.round(district.populationShare * 100)}%</span>
            <span className="district-card-score">
              {hasChanges ? (
                <>
                  <span className="district-before">{fixed(district.beforeScore)}</span>
                  <span className="district-score-arrow" aria-label="бастап">→</span>
                  <span>{fixed(district.afterScore)}</span>
                </>
              ) : (
                <span>{fixed(district.beforeScore)}</span>
              )}
              <span className="district-score-note">
                {hasChanges ? signed(district.scoreChange) : "/ 100"}
              </span>
            </span>
            {isResult && (
              <span className="district-card-marker">
                {[
                  district.id === summary.mostImproved.id ? "Ең үлкен өсім" : null,
                  district.id === summary.needsAttention.id ? "Назар қажет" : null,
                ].filter(Boolean).join(" · ") || "Ауданның өзгерісін қарау ↗"}
              </span>
            )}
          </button>
        ))}
      </div>

      {!previewError && cityAfter && <div className="city-formula" data-testid="city-formula">
        <div className="city-formula-heading"><h3>Қала ұпайы қалай қалыптасады?</h3><span>{isResult ? "8 тоқсаннан кейін" : hasChanges ? "Ағымдағы болжам" : "Бастапқы есеп"}</span></div>
        <div className="city-formula-parts">
          <div><span>70% · тұрғындар үлесімен орташа</span><strong>{fixed(cityAfter.weightedAverage)}</strong><small>Қаланың жалпы жағдайы</small></div>
          <div><span>30% · ең әлсіз аудан</span><strong>{fixed(cityAfter.weakestDistrictScore)}</strong><small>Бірде-бір аудан назардан тыс қалмасын</small></div>
          <div><span>40-тан төмен көрсеткіштер</span><strong data-testid="critical-count">{cityBefore.criticalCount} → {cityAfter.criticalCount}</strong><small>Әр көрсеткіш үшін −1 ұпай</small></div>
          <div className="city-formula-total"><span>Қаланың өмір сапасы</span><strong data-testid={isResult ? "district-city-score" : "preview-city-score"}>{fixed(cityAfter.score)}</strong><small>{hasChanges ? `${signed(cityAfter.score - cityBefore.score)} ұпай` : "ұпай"}</small></div>
        </div>
        <p>0,7 × {fixed(cityAfter.weightedAverage)} + 0,3 × {fixed(cityAfter.weakestDistrictScore)} − {cityAfter.criticalCount} = {fixed(cityAfter.score)}. Есеп толық дәлдікпен, көрсетілім екі ондық таңбамен беріледі.</p>
      </div>}
      {!previewError && !showScenarioScore && <p className="district-synthetic-note">Қорытынды Score бес жарамды шешімнен кейін есептеледі. Әзірге аудан көрсеткіштерінің алдын ала өзгерісін көре аласыз.</p>}

      {isResult && (
        <div className="district-summary">
          <div>
            <span className="district-summary-label">ЕҢ ҮЛКЕН ӨСІМ</span>
            <strong>{summary.mostImproved.name}</strong>
            <small>{signed(summary.mostImproved.scoreChange)} ұпай жақсарды</small>
          </div>
          <div>
            <span className="district-summary-label">КЕЛЕСІ НАЗАР АУДАРАТЫН АУДАН</span>
            <strong>{summary.needsAttention.name}</strong>
            <small>
              {fixed(summary.needsAttention.afterScore)} / 100 · қорытынды ұпайы ең төмен
            </small>
          </div>
          <div data-testid="district-gap">
            <span className="district-summary-label">АУДАНДАР АРАСЫНДАҒЫ АЛШАҚТЫҚ</span>
            <strong>{fixed(summary.gapBefore)} → {fixed(summary.gapAfter)} ұпай</strong>
            <small>
              {Math.abs(gapChange) < 0.005
                ? "Ең жоғары және ең төмен ұпайдың айырмасы сақталды"
                : `${fixed(Math.abs(gapChange))} ұпайға ${gapChange < 0 ? "қысқарды" : "артты"}`}
            </small>
          </div>
        </div>
      )}

      <div
        id={`district-details-${mode}`}
        className="district-detail"
        data-testid={`district-details-${active.id}`}
      >
        <div className="district-profile">
          <span className="eyebrow">АУДАНҒА ЖАҚЫНЫРАҚ ҚАРАЙЫҚ</span>
          <h3>{active.name}</h3>
          <span className="district-need-label">Бастапқы сипаттама</span>
          <p>{active.description}</p>
          <p className="district-population-detail">Қала тұрғындарының {Math.round(active.populationShare * 100)}%-ы осы ауданда.</p>
          <span className="district-need-label">
            {hasChanges ? "Әлі де назар қажет бағыт" : "Ең алдымен назар қажет бағыт"}
          </span>
          <div className="district-needs">
            <span>
              {metricNames[remainingNeed]}
              <strong>{fixed(active.after[remainingNeed])} / 100</strong>
            </span>
            {hasChanges && initialNeed !== remainingNeed && (
              <span>Бастапқы басымдық: {metricNames[initialNeed].toLowerCase()}</span>
            )}
          </div>
          <div className="district-critical-list" data-testid="district-critical-list">
            <strong>Сыни көрсеткіштер: {METRIC_KEYS.filter((key) => active.after[key] < 40).length}</strong>
            {METRIC_KEYS.filter((key) => active.after[key] < 40).map((key) => <span key={key}>{metricNames[key]} · {fixed(active.after[key])}</span>)}
            {!METRIC_KEYS.some((key) => active.after[key] < 40) && <span>40-тан төмен көрсеткіш жоқ.</span>}
          </div>
        </div>

        <div className="district-metrics">
          <div className="district-metric-header">
            <span>Он көрсеткіштің жағдайы</span>
            <div className="chart-legend">
              <span>Бұрын</span>
              <span>{isResult ? "Кейін" : "Болжам"}</span>
            </div>
          </div>
          {METRIC_KEYS.map((key) => (
            <div
              key={key}
              className={`district-metric-row ${active.after[key] < 40 ? "critical-metric" : ""}`}
              data-testid={`district-metric-${key}`}
            >
              <div className="district-metric-label">
                <span>{metricNames[key]} <small className="metric-weight">{Math.round(METRIC_WEIGHTS[key] * 100)}%</small></span>
                <span className="district-metric-value">
                  {fixed(active.before[key])} →
                  <strong>{fixed(active.after[key])}</strong>
                  <em className={active.metricChanges[key] < 0 ? "declined" : ""}>
                    {signed(active.metricChanges[key])}
                  </em>
                </span>
              </div>
              <div className="district-bar-track" aria-hidden="true">
                <span className="before-bar" style={{ width: `${active.before[key]}%` }} />
                <span className="after-bar" style={{ width: `${active.after[key]}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="district-explanation">
        <Icon name="spark" size={17} />
        <p>
          <strong>Неліктен әсер әртүрлі? </strong>
          Аудандық бастама тек таңдалған ауданға, қалалық бастама бес ауданға бірдей әсер етеді.
          Әсердің іске асқан үлесі = (8 − басталу кідірісі) / 8. Аудан ұпайы он көрсеткіштің салмақтарымен есептеледі.
          Ең әлсіз аудан мен 40-тан төмен көрсеткіштер қаланың қорытынды ұпайына бөлек ықпал етеді.
        </p>
      </div>

      {isResult && active.actionEffects.length > 0 && (
        <div className="district-contributions">
          <h4>Шешімдердің осы аудан ұпайына есептік үлесі</h4>
          <ol>
            {active.actionEffects.map((effect) => (
              <li key={effect.id}>
                <span>{effect.title}<small>{effect.lag} тоқсаннан кейін · {effect.realizedShare * 100}% әсер</small></span>
                <strong>{signed(effect.scoreContribution)}</strong>
              </li>
            ))}
          </ol>
          <p>
            {active.clamped
              ? "Үлестер 0–100 шегін қолданғанға дейін берілген. Шектелген метрикаларға байланысты олардың қосындысы соңғы өсімнен өзгеше болуы мүмкін."
              : "Үлестер басталу кідірісі мен көрсеткіш салмағын ескереді. Қосымша үйлесім әсері бөлек беріледі; дөңгелектеуде шағын айырма болуы мүмкін."}
          </p>
        </div>
      )}
      {!previewError && active.synergies.length > 0 && <div className="district-synergies" data-testid="district-synergies">
        <h4>Бірге таңдалғанда қосымша әсер</h4>
        {active.synergies.map((synergy) => <p key={synergy.id}><strong>{synergy.actionIds.join(" + ")}</strong><span>{Object.entries(synergy.impact).map(([key, value]) => `${metricNames[key as MetricKey]} ${value > 0 ? "+" : ""}${value}`).join(" · ")}</span></p>)}
        <small>Бұл тұрақты бонус басталу кідірісіне бөлінбейді.</small>
      </div>}
      <details className="metric-definitions"><summary>Көрсеткіштер нені білдіреді?</summary><dl>{METRIC_KEYS.map((key) => <div key={key}><dt>{key} · {metricNames[key]} · {Math.round(METRIC_WEIGHTS[key] * 100)}%</dt><dd>{METRIC_DESCRIPTIONS[key]}</dd></div>)}</dl></details>
      <p className="district-synthetic-note">
        Аудандар атауы нақты, көрсеткіштер синтетикалық. Бұл — 8 тоқсандық модельдік сценарий, нақты қалалық болжам емес.
      </p>
    </section>
  );
}
