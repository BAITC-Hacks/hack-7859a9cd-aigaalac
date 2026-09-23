import type {
  Action, AppliedSynergy, Category, Decision, District, MetricKey, Metrics,
  SelectedAction, SelectionValidation, SimulationPreview, SimulationResult, SimulationSnapshot, ValidationIssue,
} from "./types";

/** Fixed dataset rules; never accepted from an API request or an AI answer. */
export const TOTAL_BUDGET = 100;
export const HORIZON_QUARTERS = 8;
export const CATEGORIES = ["transport", "ecology", "social", "safety", "services"] as const satisfies readonly Category[];
export const METRIC_KEYS = ["T1", "T2", "E1", "E2", "S1", "S2", "B1", "B2", "C1", "C2"] as const satisfies readonly MetricKey[];
export const METRIC_WEIGHTS: Readonly<Metrics> = {
  T1: 0.10, T2: 0.10, E1: 0.09, E2: 0.11, S1: 0.11,
  S2: 0.11, B1: 0.09, B2: 0.09, C1: 0.10, C2: 0.10,
};

function zeroMetrics(): Metrics {
  return { T1: 0, T2: 0, E1: 0, E2: 0, S1: 0, S2: 0, B1: 0, B2: 0, C1: 0, C2: 0 };
}

export function clampMetric(value: number): number {
  if (!Number.isFinite(value)) throw new Error("Көрсеткіш ақырлы сан болуы керек.");
  return Math.min(100, Math.max(0, value));
}

function assertMetrics(metrics: Metrics): void {
  for (const key of METRIC_KEYS) {
    if (!Number.isFinite(metrics[key]) || metrics[key] < 0 || metrics[key] > 100)
      throw new Error(`Көрсеткіш 0–100 аралығында болуы керек: ${key}`);
  }
}

export function assertDistricts(districts: readonly District[]): void {
  if (districts.length === 0) throw new Error("Кемінде бір аудан қажет.");
  const ids = new Set<string>();
  let population = 0;
  for (const district of districts) {
    assertMetrics(district.metrics);
    if (!district.id || ids.has(district.id)) throw new Error("Аудан идентификаторлары бос емес және бірегей болуы керек.");
    ids.add(district.id);
    if (!Number.isFinite(district.populationShare) || district.populationShare <= 0 || district.populationShare > 1)
      throw new Error("Аудан халқының үлесі 0-ден үлкен және 1-ден аспауы керек.");
    population += district.populationShare;
  }
  if (Math.abs(population - 1) > 1e-9) throw new Error("Аудандар халқы үлестерінің қосындысы 1 болуы керек.");
}

/** District D: the fixed weighted sum of its ten benefit indicators. */
export function calculateDistrictScore(metrics: Metrics): number {
  assertMetrics(metrics);
  return METRIC_KEYS.reduce((sum, key) => sum + METRIC_WEIGHTS[key] * metrics[key], 0);
}

/** Population-weighted city indicators, with no intermediate rounding. */
export function calculateAverageMetrics(districts: readonly District[]): Metrics {
  assertDistricts(districts);
  const average = zeroMetrics();
  for (const district of districts)
    for (const key of METRIC_KEYS) average[key] += district.metrics[key] * district.populationShare;
  return average;
}

export function calculateRealizedShare(action: Pick<Action, "lag">): number {
  if (!Number.isInteger(action.lag) || action.lag < 0 || action.lag > HORIZON_QUARTERS)
    throw new Error("Іске қосылу мерзімі 0–8 тоқсан аралығындағы бүтін сан болуы керек.");
  return (HORIZON_QUARTERS - action.lag) / HORIZON_QUARTERS;
}

export function actionAppliesToDistrict(action: SelectedAction, districtId: string): boolean {
  return action.scope === "city" || action.districtId === districtId;
}

/** Fixed bonuses are independent of lag and apply to the first measure's district. */
export function getAppliedSynergies(actions: readonly SelectedAction[]): AppliedSynergy[] {
  const byId = new Map(actions.map((action) => [action.id, action]));
  const rules: { actionIds: [string, string]; impact: Partial<Metrics> }[] = [
    { actionIds: ["M1", "M2"], impact: { T1: 2 } },
    { actionIds: ["M10", "M12"], impact: { B1: 2 } },
    { actionIds: ["M5", "M6"], impact: { E2: 2 } },
  ];
  return rules.flatMap(({ actionIds, impact }) => {
    const first = byId.get(actionIds[0]);
    if (!first || !byId.has(actionIds[1])) return [];
    if (!first.districtId) throw new Error("Синергия үшін аудан таңдалуы керек.");
    return [{ id: actionIds.join("+"), actionIds, districtId: first.districtId, impact: { ...impact } }];
  });
}

/** Apply only scoped, lag-adjusted effects and fixed bonuses, then clamp once. */
export function applyImpacts(districts: readonly District[], actions: readonly SelectedAction[]): District[] {
  assertDistricts(districts);
  const districtIds = new Set(districts.map((district) => district.id));
  const seenActions = new Set<string>();
  for (const action of actions) {
    calculateRealizedShare(action);
    if (seenActions.has(action.id)) throw new Error("Іс-шараны қайталауға болмайды.");
    seenActions.add(action.id);
    if (action.scope === "district" && (!action.districtId || !districtIds.has(action.districtId)))
      throw new Error("Іс-шараға жарамды аудан таңдалуы керек.");
    if (action.scope === "city" && Object.hasOwn(action, "districtId"))
      throw new Error("Қалалық іс-шараға жеке аудан көрсетілмейді.");
    if (action.scope !== "city" && action.scope !== "district") throw new Error("Іс-шараның қамту аумағы жарамсыз.");
    for (const key of METRIC_KEYS)
      if (action.impact[key] !== undefined && !Number.isFinite(action.impact[key]))
        throw new Error(`Іс-шара әсері жарамсыз: ${action.id}`);
  }
  const synergies = getAppliedSynergies(actions);
  return districts.map((district) => {
    const applicable = actions.filter((action) => actionAppliesToDistrict(action, district.id));
    const bonuses = synergies.filter((synergy) => synergy.districtId === district.id);
    const metrics = zeroMetrics();
    for (const key of METRIC_KEYS) {
      const deltas = applicable.map((action) => (action.impact[key] ?? 0) * calculateRealizedShare(action));
      deltas.push(...bonuses.map((bonus) => bonus.impact[key] ?? 0));
      // Canonical numeric addition also removes floating-point order dependence.
      const change = deltas.sort((a, b) => a - b).reduce((sum, value) => sum + value, 0);
      metrics[key] = clampMetric(district.metrics[key] + change);
    }
    return { ...district, metrics };
  });
}

function isDecision(value: unknown): value is Decision {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return Object.keys(record).every((key) => key === "actionId" || key === "districtId")
    && typeof record.actionId === "string" && record.actionId.length > 0
    && (!Object.hasOwn(record, "districtId") || typeof record.districtId === "string");
}

/** Only measure IDs and district IDs are accepted; all other values are trusted catalog data. */
export function validateSelection(input: unknown, catalog: readonly Action[], districts: readonly District[]): SelectionValidation {
  const issues: ValidationIssue[] = [];
  const selectedActions: SelectedAction[] = [];
  const categoryCounts: Record<Category, number> = { transport: 0, ecology: 0, social: 0, safety: 0, services: 0 };
  const decisionCount = Array.isArray(input) ? input.length : 0;
  const byId = new Map(catalog.map((action) => [action.id, action]));
  const districtIds = new Set(districts.map((district) => district.id));
  const seenIds = new Set<string>();

  if (!Array.isArray(input) || input.length > catalog.length || !input.every(isDecision)) {
    issues.push({ code: "INVALID_SELECTION", message: "Әр шешімде тек іс-шара идентификаторы және қажет болса аудан идентификаторы болуы керек." });
  } else {
    for (const decision of input) {
      if (seenIds.has(decision.actionId)) {
        issues.push({ code: "DUPLICATE_ACTION", message: `Іс-шара қайталанған: ${decision.actionId}.` });
        continue;
      }
      seenIds.add(decision.actionId);
      const action = byId.get(decision.actionId);
      if (!action) {
        issues.push({ code: "UNKNOWN_ACTION", message: `Белгісіз іс-шара: ${decision.actionId}.` });
        continue;
      }
      if (action.scope === "district") {
        if (!decision.districtId) issues.push({ code: "DISTRICT_REQUIRED", message: `«${action.title}» үшін аудан таңдаңыз.` });
        else if (!districtIds.has(decision.districtId)) issues.push({ code: "UNKNOWN_DISTRICT", message: `Белгісіз аудан: ${decision.districtId}.` });
      } else if (Object.hasOwn(decision, "districtId")) {
        issues.push({ code: "UNEXPECTED_DISTRICT", message: `«${action.title}» бүкіл қалаға арналған: жеке аудан көрсетілмейді.` });
      }
      selectedActions.push({ ...action, impact: { ...action.impact }, ...(Object.hasOwn(decision, "districtId") ? { districtId: decision.districtId } : {}) });
      categoryCounts[action.category] += 1;
    }
  }
  selectedActions.sort((a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1)) || a.id.localeCompare(b.id));
  if (decisionCount !== 5) issues.push({ code: "DECISION_COUNT", message: `Дәл 5 шешім қажет. Қазір таңдалғаны: ${decisionCount}.` });
  for (const category of CATEGORIES) {
    if (categoryCounts[category] > 1) issues.push({ code: "CATEGORY_LIMIT", message: "Әр бағыттан тек бір іс-шара таңдауға болады." });
  }
  if (CATEGORIES.some((category) => categoryCounts[category] === 0))
    issues.push({ code: "CATEGORY_REQUIRED", message: "Бес бағыттың әрқайсысынан бір іс-шара таңдаңыз." });
  const selectedById = new Map(selectedActions.map((action) => [action.id, action]));
  if (selectedById.has("M1") && selectedById.has("M3"))
    issues.push({ code: "INCOMPATIBLE", message: "Автобус жолақтары (M1) мен жеңіл рельсті көлік (M3) бірге таңдалмайды, аудандары әртүрлі болса да." });
  for (const [firstId, secondId, message] of [
    ["M4", "M7", "Саябақ (M4) пен мектеп-балабақша (M7) бір ауданда жер теліміне таласады."],
    ["M5", "M13", "Таза отын бағдарламасы (M5) мен желілерді жаңарту (M13) бір ауданда бірін-бірі қайталайды."],
  ]) {
    const first = selectedById.get(firstId);
    const second = selectedById.get(secondId);
    if (first?.districtId && first.districtId === second?.districtId) issues.push({ code: "INCOMPATIBLE", message });
  }
  const totalCost = selectedActions.reduce((sum, action) => sum + action.cost, 0);
  const remainingBudget = TOTAL_BUDGET - totalCost;
  const overBudgetBy = Math.max(0, -remainingBudget);
  if (overBudgetBy > 0) issues.push({ code: "OVER_BUDGET", message: `Бюджет жеткіліксіз: ${overBudgetBy} шартты бірлік жетпейді.` });
  return { valid: issues.length === 0, selectedActions, decisionCount, categoryCounts, totalCost, remainingBudget, overBudgetBy, issues };
}

export class SelectionValidationError extends Error {
  readonly validation: SelectionValidation;
  constructor(validation: SelectionValidation) {
    super(validation.issues.map((issue) => issue.message).join(" "));
    this.name = "SelectionValidationError";
    this.validation = validation;
  }
}

export function createSnapshot(districts: readonly District[]): SimulationSnapshot {
  const averageMetrics = calculateAverageMetrics(districts);
  const districtScores: Record<string, number> = Object.create(null);
  const criticalIndicators: SimulationSnapshot["criticalIndicators"] = [];
  let weightedAverage = 0;
  let weakestDistrictScore = Infinity;
  for (const district of districts) {
    const score = calculateDistrictScore(district.metrics);
    districtScores[district.id] = score;
    weightedAverage += district.populationShare * score;
    weakestDistrictScore = Math.min(weakestDistrictScore, score);
    for (const metric of METRIC_KEYS)
      if (district.metrics[metric] < 40) criticalIndicators.push({ districtId: district.id, metric, value: district.metrics[metric] });
  }
  const criticalCount = criticalIndicators.length;
  return {
    districts: districts.map((district) => ({ ...district, metrics: { ...district.metrics } })),
    averageMetrics, districtScores, weightedAverage, weakestDistrictScore, criticalCount, criticalIndicators,
    score: 0.7 * weightedAverage + 0.3 * weakestDistrictScore - criticalCount,
  };
}

function resultFromValidation(districts: readonly District[], validation: SelectionValidation): SimulationResult {
  const before = createSnapshot(districts);
  const after = createSnapshot(applyImpacts(districts, validation.selectedActions));
  return {
    budget: TOTAL_BUDGET, totalCost: validation.totalCost, remainingBudget: validation.remainingBudget,
    selectedActions: validation.selectedActions, before, after, scoreChange: after.score - before.score,
    synergies: getAppliedSynergies(validation.selectedActions),
  };
}

/** Strict server entry point: invalid plans never receive a score. */
export function simulateDecisions(districts: readonly District[], catalog: readonly Action[], input: unknown): SimulationResult {
  const validation = validateSelection(input, catalog, districts);
  if (!validation.valid) throw new SelectionValidationError(validation);
  return resultFromValidation(districts, validation);
}

/** Partial, rule-compliant plans may be previewed locally without calling AI. */
export function previewDecisions(districts: readonly District[], catalog: readonly Action[], input: unknown): SimulationPreview | null {
  const validation = validateSelection(input, catalog, districts);
  if (validation.decisionCount > 5 || validation.issues.some((issue) => issue.code !== "DECISION_COUNT" && issue.code !== "CATEGORY_REQUIRED")) return null;
  return {
    districts: applyImpacts(districts, validation.selectedActions),
    selectedActions: validation.selectedActions,
    synergies: getAppliedSynergies(validation.selectedActions),
  };
}
