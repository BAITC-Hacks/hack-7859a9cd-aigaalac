import { assertDistricts, calculateRealizedShare, METRIC_KEYS } from "./score";
import type { District, Metrics, SelectedAction } from "./types";

export type CityFeatureKind =
  | "bus-lane" | "smart-signals" | "light-rail" | "park"
  | "clean-heating" | "green-belt" | "school" | "clinic"
  | "sports" | "street-lights" | "safe-crossing" | "service-hub"
  | "utility-pipes" | "emergency-hub";

export interface CityFeature {
  id: string;
  actionId: string;
  title: string;
  kind: CityFeatureKind;
  intensity: number;
  scope: "district" | "city";
  description: string;
}

export interface DistrictVisualState {
  id: string;
  name: string;
  metrics: Metrics;
  baseline: Metrics;
  populationShare: number;
  features: CityFeature[];
  /** Decorative counts and appearance, not real buildings or measured vehicles. */
  treeCount: number;
  trafficLevel: number;
  airQuality: number;
  serviceQuality: number;
}

export interface CityVisualState {
  districts: DistrictVisualState[];
  actionCount: number;
  featureCount: number;
  view: "before" | "after";
}

export const ACTION_VISUALS: Readonly<Record<string, { kind: CityFeatureKind; description: string }>> = {
  M1: { kind: "bus-lane", description: "Арнайы автобус жолағы мен автобус көрінеді." },
  M2: { kind: "smart-signals", description: "Қиылыстарда ақылды бағдаршамдар пайда болады." },
  M3: { kind: "light-rail", description: "Көтеріңкі рельс жолы мен пойыз қосылады." },
  M4: { kind: "park", description: "Ағаштары мен серуен жолы бар саябақ салынады." },
  M5: { kind: "clean-heating", description: "Таза отын қондырғысы пайда болып, түтін азаяды." },
  M6: { kind: "green-belt", description: "Аудан шетіне желден қорғайтын ағаштар қатары қосылады." },
  M7: { kind: "school", description: "Мектеп пен балабақша кешені салынады." },
  M8: { kind: "clinic", description: "Медициналық белгісі бар денсаулық орталығы ашылады." },
  M9: { kind: "sports", description: "Аулада спорт алаңы пайда болады." },
  M10: { kind: "street-lights", description: "Жарық шамдары мен бақылау камералары орнатылады." },
  M11: { kind: "safe-crossing", description: "Қауіпсіз өткел мен мектеп аймағы белгіленеді." },
  M12: { kind: "service-hub", description: "Тұрғындар өтінішін қабылдайтын цифрлық сервис нүктесі қосылады." },
  M13: { kind: "utility-pipes", description: "Жаңартылған су және жылу желілері түспен көрсетіледі." },
  M14: { kind: "emergency-hub", description: "Жедел коммуналдық бригада бекеті мен арнайы көлік қосылады." },
};

/**
 * Presentation only: maps authoritative district metrics and scoped decisions to
 * procedural objects. It never computes a city score, calls AI, or changes data.
 */
export function buildCityVisualState(
  before: readonly District[],
  after: readonly District[],
  actions: readonly SelectedAction[],
  view: "before" | "after" = "after",
): CityVisualState {
  assertDistricts(before);
  assertDistricts(after);
  const finalById = new Map(after.map((district) => [district.id, district]));
  if (before.length !== after.length || before.some((district) => !finalById.has(district.id)))
    throw new Error("3D көріністегі аудандар бастапқы деректерге сәйкес болуы керек.");

  const districtIds = new Set(before.map((district) => district.id));
  const seen = new Set<string>();
  const ordered = [...actions].sort((a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1)));
  for (const action of ordered) {
    if (!Object.hasOwn(ACTION_VISUALS, action.id)) throw new Error(`Іс-шараның 3D көрінісі анықталмаған: ${action.id}`);
    if (seen.has(action.id)) throw new Error("3D көріністе бір іс-шара қайталанбауы керек.");
    seen.add(action.id);
    calculateRealizedShare(action);
    if (action.scope === "district") {
      if (!action.districtId || !districtIds.has(action.districtId))
        throw new Error("Аудандық 3D өзгеріс үшін жарамды аудан таңдалуы керек.");
    } else if (action.scope !== "city" || Object.hasOwn(action, "districtId")) {
      throw new Error("Қалалық 3D өзгеріске жеке аудан тағайындалмайды.");
    }
  }

  const districts = before.map((district): DistrictVisualState => {
    const final = finalById.get(district.id)!;
    if (final.populationShare !== district.populationShare)
      throw new Error("3D көрініс аудан халқының үлесін өзгертпейді.");
    const source = view === "before" ? district.metrics : final.metrics;
    // Copy only the fixed metric keys; rendering must never mutate snapshots.
    const metrics = Object.fromEntries(METRIC_KEYS.map((key) => [key, source[key]])) as unknown as Metrics;
    const features = view === "before" ? [] : ordered
      .filter((action) => action.scope === "city" || action.districtId === district.id)
      .map((action): CityFeature => ({
        id: `${district.id}:${action.id}`,
        actionId: action.id,
        title: action.title,
        kind: ACTION_VISUALS[action.id].kind,
        intensity: calculateRealizedShare(action),
        scope: action.scope,
        description: ACTION_VISUALS[action.id].description,
      }));
    return {
      id: district.id,
      name: district.name,
      metrics,
      baseline: { ...district.metrics },
      populationShare: district.populationShare,
      features,
      treeCount: 4 + Math.round(metrics.E1 / 7),
      trafficLevel: (100 - metrics.T1) / 100,
      airQuality: metrics.E2 / 100,
      serviceQuality: (metrics.C1 + metrics.C2) / 200,
    };
  });
  return {
    districts,
    actionCount: view === "before" ? 0 : ordered.length,
    featureCount: districts.reduce((sum, district) => sum + district.features.length, 0),
    view,
  };
}
