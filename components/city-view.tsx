"use client";

import dynamic from "next/dynamic";
import { Component, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { buildCityVisualState } from "@/lib/city-visuals";
import { DISTRICT_IDENTITIES } from "@/lib/district-identities";
import { METRIC_LABELS } from "@/lib/labels";
import { METRIC_KEYS } from "@/lib/score";
import type { District, SelectedAction } from "@/lib/types";
import styles from "./city-view.module.css";

const CityScene = dynamic(() => import("./city-scene"), { ssr: false });
type CameraCommand = "reset" | "zoom-in" | "zoom-out" | "rotate-left" | "rotate-right";

class SceneBoundary extends Component<{
  children: ReactNode;
  onError: (message: string) => void;
}, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError("3D көріністі жүктеу мүмкін болмады."); }
  render() { return this.state.failed ? null : this.props.children; }
}

function CubeMark() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="m12 2 9 5v10l-9 5-9-5V7l9-5Z" /><path d="m3 7 9 5 9-5M12 12v10M7.5 4.5l9 5" /></svg>;
}

export function CityView({
  before,
  after,
  actions,
  mode,
  selectedCount = actions.length,
  previewError = "",
  focusedDistrictId,
  onDistrictSelect,
  variant = "full",
  selectionVersion = 0,
}: {
  before: readonly District[];
  after: readonly District[];
  actions: readonly SelectedAction[];
  mode: "preview" | "result";
  selectedCount?: number;
  previewError?: string;
  focusedDistrictId: string | null;
  onDistrictSelect: (id: string | null) => void;
  variant?: "full" | "docked";
  selectionVersion?: number;
}) {
  const [view, setView] = useState<"before" | "after">("after");
  const [legendOpen, setLegendOpen] = useState(false);
  const [cameraControlsOpen, setCameraControlsOpen] = useState(false);
  const previousSelectionVersion = useRef(selectionVersion);
  const focusStrip = useRef<HTMLDivElement>(null);
  const docked = variant === "docked";
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [cameraCommand, setCameraCommand] = useState<{ type: CameraCommand; nonce: number }>();
  useEffect(() => {
    if (previousSelectionVersion.current !== selectionVersion) {
      previousSelectionVersion.current = selectionVersion;
      setView("after");
      setCameraControlsOpen(false);
    }
  }, [selectionVersion]);
  useEffect(() => {
    const strip = focusStrip.current;
    const selected = strip?.querySelector<HTMLElement>('button[aria-pressed="true"]');
    if (!strip || !selected || strip.scrollWidth <= strip.clientWidth) return;
    const bounds = strip.getBoundingClientRect();
    const target = selected.getBoundingClientRect();
    if (target.left < bounds.left) strip.scrollLeft += target.left - bounds.left - 8;
    else if (target.right > bounds.right) strip.scrollLeft += target.right - bounds.right + 8;
  }, [focusedDistrictId]);
  const showBefore = view === "before" || Boolean(previewError);
  const state = useMemo(
    () => buildCityVisualState(before, previewError ? before : after, previewError ? [] : actions, showBefore ? "before" : "after"),
    [before, after, actions, previewError, showBefore],
  );
  const focused = state.districts.find((district) => district.id === focusedDistrictId);
  const focusedIdentity = focused ? DISTRICT_IDENTITIES[focused.id] : undefined;
  const visibleDistricts = focused ? [focused] : state.districts;
  const visibleFeatures = visibleDistricts.flatMap((district) => district.features.map((feature) => ({ ...feature, districtId: district.id, districtName: district.name })));
  const actionGroups = [...new Set(visibleFeatures.map((feature) => feature.actionId))].map((actionId) => {
    const features = visibleFeatures.filter((feature) => feature.actionId === actionId);
    return { actionId, title: features[0].title, description: features[0].description, districts: features.map((feature) => ({ id: feature.districtId, name: feature.districtName })) };
  });
  const changedMetrics = focused ? METRIC_KEYS.map((key) => ({ key, change: focused.metrics[key] - focused.baseline[key] }))
    .filter((metric) => Math.abs(metric.change) > 0.00001)
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change)).slice(0, 2) : [];
  const onReady = useCallback((value: boolean) => setReady(value), []);
  const onError = useCallback((_message: string) => { setFailed(true); setReady(false); }, []);
  const selectSceneDistrict = useCallback((id: string | null) => onDistrictSelect(id), [onDistrictSelect]);

  function moveCamera(type: CameraCommand) {
    setCameraCommand((previous) => ({ type, nonce: (previous?.nonce ?? 0) + 1 }));
  }

  function retry() { setFailed(false); setReady(false); setAttempt((value) => value + 1); }

  return <section id={`city-view-${mode}`} className={`${styles.shell} ${mode === "result" ? styles.result : ""} ${docked ? styles.docked : ""}`} aria-labelledby={`city-view-heading-${mode}`} data-testid={`city-view-${mode}`} data-variant={variant}>
    <div className={styles.heading}>
      <div>{!docked && <div className={styles.eyebrow}><CubeMark /> ШЕШІМДЕР КӨРІНІСКЕ АЙНАЛАДЫ</div>}<h2 id={`city-view-heading-${mode}`}>{docked ? "Қаладағы өзгеріс" : "Қалаңызды 3D-де көріңіз"}</h2>{!docked && <p>Ауданды ашып қараңыз. Әр бастама қалада өз ізін қалдырады.</p>}</div>
      <div className={styles.viewSwitch} role="group" aria-label="Қала көрінісін салыстыру">
        <button type="button" aria-label="Бастапқы көрініс" aria-pressed={view === "before"} onClick={() => setView("before")} data-testid="city-view-before">{docked ? "Бұрын" : "Бастапқы көрініс"}</button>
        <button type="button" aria-label="Таңдаулардан кейін" aria-pressed={view === "after"} onClick={() => setView("after")} data-testid="city-view-after">{docked ? "Кейін" : "Таңдаулардан кейін"}</button>
      </div>
    </div>

    <div ref={focusStrip} className={styles.districtFocus} role="group" aria-label="3D көріністегі аудан">
      <button type="button" aria-pressed={!focusedDistrictId} onClick={() => onDistrictSelect(null)} data-testid="city-focus-all">Бүкіл қала</button>
      {before.map((district) => <button type="button" key={district.id} aria-pressed={focusedDistrictId === district.id} onClick={() => onDistrictSelect(district.id)} data-testid={`city-focus-${district.id}`}>{district.name}</button>)}
    </div>

    {previewError && <div className={styles.validation} role="status"><strong>Бастапқы қала көрсетілген.</strong> {previewError} Өзгерістерді көру үшін таңдауды түзетіңіз.</div>}

    <div className={styles.viewport} aria-label="Қаланың интерактивті үш өлшемді көрінісі" aria-busy={!ready && !failed}>
      {!failed ? <SceneBoundary key={attempt} onError={onError}>
        <CityScene state={state} focusedDistrictId={focusedDistrictId} onDistrictSelect={selectSceneDistrict} cameraCommand={cameraCommand} onReady={onReady} onError={onError} />
      </SceneBoundary> : <div className={styles.fallback} data-testid="city-3d-fallback">
        <div className={styles.fallbackHeading}><CubeMark /><h3>3D көрінісі бұл браузерде ашылмады</h3><p>Қаланың есептелген өзгерістері төмендегі аудан карточкаларында сақталған.</p><button type="button" onClick={retry} data-testid="city-3d-retry">3D көріністі қайта жүктеу</button></div>
        <div className={styles.fallbackDistricts}>{state.districts.map((district) => <button type="button" key={district.id} onClick={() => onDistrictSelect(district.id)} aria-pressed={focusedDistrictId === district.id}><strong>{district.name}</strong>{DISTRICT_IDENTITIES[district.id]?.landmarkName && <em className={styles.fallbackIdentity}>{DISTRICT_IDENTITIES[district.id].landmarkName}</em>}<span>{district.features.length ? `${district.features.length} көрнекі өзгеріс` : "Бастапқы жағдай"}</span><small>{district.features.map((feature) => feature.title).join(" · ") || "Бастамалар таңдалған сайын ауданның өзгерісі осында беріледі."}</small></button>)}</div>
      </div>}

      {!ready && !failed && <div className={styles.loading} role="status"><span className={styles.loadingCube}><CubeMark /></span><strong>Қала көрінісі дайындалуда</strong><span>Бес ауданның үлгісі жүктеліп жатыр…</span></div>}

      {!failed && <>
        <div className={styles.sceneBadge}>
          <span className={styles.sceneBadgeTime}><i style={focusedIdentity ? { background: focusedIdentity.accent } : undefined} />{showBefore ? "БАСТАПҚЫ ҚАЛА" : "8 ТОҚСАННАН КЕЙІН"}</span>
          <strong className={styles.districtIdentity} data-testid="city-district-identity" aria-live="polite" aria-label={focusedIdentity && focused ? `${focused.name}. ${focusedIdentity.landmarkName}. ${focusedIdentity.description}` : undefined}>{focused ? `${focused.name.replace(/ ауданы$/, "")} · ${focusedIdentity?.landmarkName ?? "Ауданның келбеті"}` : "Бес аудан — бес ерекше келбет"}</strong>
        </div>
        {docked && <button type="button" className={styles.cameraToggle} aria-label="Камераны басқару" aria-expanded={cameraControlsOpen} aria-controls={`city-camera-controls-${mode}`} data-testid="city-camera-toggle" onClick={() => setCameraControlsOpen((value) => !value)}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 9V4h5m6 0h5v5m0 6v5h-5m-6 0H4v-5" /><circle cx="12" cy="12" r="3" /></svg></button>}
        <div id={`city-camera-controls-${mode}`} className={`${styles.controls} ${cameraControlsOpen ? styles.controlsOpen : ""}`} role="group" aria-label="3D камерасын басқару">
          {([
            ["zoom-in", "+", "Жақындату"], ["zoom-out", "−", "Алыстату"],
            ["rotate-left", "↶", "Солға бұру"], ["rotate-right", "↷", "Оңға бұру"], ["reset", "⌂", "Көріністі бастапқы орынға қайтару"],
          ] as const).map(([command, symbol, label]) => <button type="button" key={command} aria-label={label} title={label} disabled={!ready} onClick={() => moveCamera(command)} data-testid={`city-camera-${command}`}>{symbol}</button>)}
        </div>
        {!docked && <div className={styles.focusReadout} aria-live="polite"><span>{focused ? "ТАҢДАЛҒАН АУДАН" : "ҚАЛАНЫ ТОЛЫҚ ҚАРАУ"}</span><strong>{focused?.name ?? "Астананың бес ауданы"}</strong><p>{showBefore ? "Бастамаларға дейінгі жағдай" : visibleFeatures.length ? `${visibleFeatures.length} көрнекі өзгеріс · ${actionGroups.length} бастама` : "Бастама таңдаңыз — қала өзгереді"}</p>{changedMetrics.length > 0 && <div className={styles.metricChips}>{changedMetrics.map(({ key, change }) => <span key={key}>{METRIC_LABELS[key]} <b>{change > 0 ? "+" : ""}{change.toFixed(2)}</b></span>)}</div>}</div>}
      </>}
    </div>

    <div className={styles.statusRow}><span data-testid="city-3d-status" aria-live="polite">{failed ? "3D қолжетімсіз · аудан карточкалары көрсетілген" : !ready ? "3D көрінісі жүктелуде" : showBefore ? "Бастапқы көрініс · шешімдеріңіз сақталған" : `${selectedCount} / 5 шешім · ${state.featureCount} көрнекі өзгеріс`}</span>{!docked && <span>Сүйреп бұрыңыз · дөңгелекпен жақындатыңыз</span>}{docked && <button type="button" className={styles.legendToggle} aria-expanded={legendOpen} aria-controls={`city-feature-legend-${mode}`} data-testid="city-legend-toggle" onClick={() => setLegendOpen((value) => !value)}>{legendOpen ? "Жасыру ↑" : "Нысандар ↓"}</button>}</div>

    <div id={`city-feature-legend-${mode}`} className={`${styles.legend} ${legendOpen ? styles.legendOpen : ""}`} data-testid="city-visible-features" aria-live="polite">
      <div className={styles.legendHeading}><h3>{focused ? `${focused.name}: көріністегі өзгерістер` : "Көріністегі өзгерістер"}</h3><span>{showBefore ? "Бастапқы күй" : `${actionGroups.length} бастама`}</span></div>
      {actionGroups.length > 0 ? <ul>{actionGroups.map((group) => <li key={group.actionId} data-testid={`city-feature-group-${group.actionId}`}><span className={styles.featureMark} /><div><strong>{group.title}</strong>{!docked && <p>{group.description}</p>}<small>{group.districts.map((district, index) => <span key={district.id} data-testid={`city-feature-${district.id}-${group.actionId}`}>{index > 0 ? " · " : ""}{district.name}</span>)}</small></div></li>)}</ul> : <p className={styles.emptyLegend}>{previewError ? "Жоспар түзетілген соң нысандар осы жерде көрсетіледі." : view === "before" ? "Шешімдердің әсерін көру үшін «Таңдаулардан кейін» көрінісіне өтіңіз." : focused ? "Бұл ауданға арналған немесе бүкіл қалаға әсер ететін бастама таңдаңыз." : "Мектеп, саябақ, жол және қалалық қызметтерді таңдаған сайын олардың үлгілері осында пайда болады."}</p>}
    </div>
    {mode === "preview" && !docked && <a className={styles.chooseLink} href="#decisions">Бастамаларды таңдау ↓</a>}
    <p className={styles.note}>Аудандардың орналасуы — сызбалық. Нысандар саны шартты.</p>
  </section>;
}
