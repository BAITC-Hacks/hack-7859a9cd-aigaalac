import {
  actionAppliesToDistrict, assertDistricts, calculateDistrictScore, calculateRealizedShare,
  getAppliedSynergies, METRIC_KEYS, METRIC_WEIGHTS,
} from "./score";
import type { AppliedSynergy, Category, District, MetricKey, Metrics, SelectedAction } from "./types";

export interface DistrictActionEffect {
  id: string;
  title: string;
  category: Category;
  /** Lag-adjusted contribution before the final 0–100 limit; excludes synergy. */
  impact: Partial<Metrics>;
  /** Contribution to district D, not to the nonlinear final city score. */
  scoreContribution: number;
  lag: number;
  realizedShare: number;
}

export interface DistrictReport {
  id: string;
  name: string;
  character: string;
  description: string;
  populationShare: number;
  before: Metrics;
  after: Metrics;
  beforeScore: number;
  afterScore: number;
  scoreChange: number;
  metricChanges: Metrics;
  initialPriority: MetricKey;
  remainingPriority: MetricKey;
  actionEffects: DistrictActionEffect[];
  synergies: AppliedSynergy[];
  clamped: boolean;
}

function lowestMetric(metrics: Metrics): MetricKey {
  return METRIC_KEYS.reduce((lowest, key) => metrics[key] < metrics[lowest] ? key : lowest);
}

/** Shared explanations use actual snapshots; all arithmetic retains full precision. */
export function buildDistrictReports(
  before: readonly District[], after: readonly District[], actions: readonly SelectedAction[],
): DistrictReport[] {
  assertDistricts(before);
  assertDistricts(after);
  const finalById = new Map(after.map((district) => [district.id, district]));
  if (after.length !== before.length || finalById.size !== after.length)
    throw new Error("Бастапқы және соңғы аудандар сәйкес болуы керек.");
  const bonuses = getAppliedSynergies(actions);
  return before.map((district) => {
    const final = finalById.get(district.id);
    if (!final || final.populationShare !== district.populationShare)
      throw new Error(`Аудан нәтижесі сәйкес емес: ${district.id}`);
    const beforeScore = calculateDistrictScore(district.metrics);
    const afterScore = calculateDistrictScore(final.metrics);
    const actionEffects = actions.filter((action) => actionAppliesToDistrict(action, district.id)).map((action): DistrictActionEffect => {
      const realizedShare = calculateRealizedShare(action);
      const impact: Partial<Metrics> = {};
      for (const key of METRIC_KEYS) {
        if (action.impact[key] === undefined) continue;
        if (!Number.isFinite(action.impact[key])) throw new Error(`Іс-шара әсері жарамсыз: ${action.id}`);
        impact[key] = action.impact[key]! * realizedShare;
      }
      return {
        id: action.id, title: action.title, category: action.category, impact,
        lag: action.lag, realizedShare,
        scoreContribution: METRIC_KEYS.reduce((sum, key) => sum + (impact[key] ?? 0) * METRIC_WEIGHTS[key], 0),
      };
    });
    const synergies = bonuses.filter((bonus) => bonus.districtId === district.id);
    const metricChanges = Object.fromEntries(METRIC_KEYS.map((key) => [key, final.metrics[key] - district.metrics[key]])) as unknown as Metrics;
    const clamped = METRIC_KEYS.some((key) => {
      const projected = district.metrics[key]
        + actionEffects.reduce((sum, effect) => sum + (effect.impact[key] ?? 0), 0)
        + synergies.reduce((sum, bonus) => sum + (bonus.impact[key] ?? 0), 0);
      return projected < -1e-9 || projected > 100 + 1e-9;
    });
    return {
      id: district.id, name: district.name,
      character: district.character ?? "Қаланың шартты ауданы",
      description: district.description ?? "Ауданның бастапқы күйі он көрсеткіш арқылы сипатталады.",
      populationShare: district.populationShare,
      before: { ...district.metrics }, after: { ...final.metrics },
      beforeScore, afterScore, scoreChange: afterScore - beforeScore,
      metricChanges, initialPriority: lowestMetric(district.metrics), remainingPriority: lowestMetric(final.metrics),
      actionEffects, synergies, clamped,
    };
  });
}

export function summarizeDistricts(reports: readonly DistrictReport[]): {
  mostImproved: DistrictReport; needsAttention: DistrictReport; gapBefore: number; gapAfter: number;
} {
  if (reports.length === 0) throw new Error("Кемінде бір аудан есебі қажет.");
  return {
    mostImproved: reports.reduce((best, report) => report.scoreChange > best.scoreChange ? report : best),
    needsAttention: reports.reduce((lowest, report) => report.afterScore < lowest.afterScore ? report : lowest),
    gapBefore: Math.max(...reports.map((report) => report.beforeScore)) - Math.min(...reports.map((report) => report.beforeScore)),
    gapAfter: Math.max(...reports.map((report) => report.afterScore)) - Math.min(...reports.map((report) => report.afterScore)),
  };
}
