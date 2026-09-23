import type { AIExplanation, MetricKey, Metrics, SimulationResult, SimulationSnapshot } from "./types";
import { buildDistrictReports, summarizeDistricts } from "./districts";
import { METRIC_LABELS } from "./labels";
import { calculateRealizedShare, HORIZON_QUARTERS, METRIC_KEYS, METRIC_WEIGHTS } from "./score";

const round = (value: number) => Number(value.toFixed(2));

function labelMetrics(metrics: Partial<Metrics>) {
  return Object.fromEntries(
    Object.entries(metrics).map(([key, value]) => [METRIC_LABELS[key as MetricKey], round(value)]),
  );
}

/** A single, auditable source of numerical context for the explanation model. */
export function buildAnalysisContext(result: SimulationResult) {
  const reports = buildDistrictReports(result.before.districts, result.after.districts, result.selectedActions);
  const summary = summarizeDistricts(reports);
  const districtNames = new Map(result.before.districts.map((district) => [district.id, district.name]));
  const components = (snapshot: SimulationSnapshot) => ({
    weightedAverage: round(snapshot.weightedAverage),
    weakestDistrictScore: round(snapshot.weakestDistrictScore),
    criticalCount: snapshot.criticalCount,
    criticalIndicators: snapshot.criticalIndicators.map((indicator) => ({
      district: districtNames.get(indicator.districtId),
      metric: METRIC_LABELS[indicator.metric],
      value: round(indicator.value),
    })),
  });
  return {
    budget: result.budget,
    spent: result.totalCost,
    remaining: result.remainingBudget,
    costUnit: "шартты бірлік",
    horizonQuarters: HORIZON_QUARTERS,
    decisions: result.selectedActions.map((action) => ({
      id: action.id,
      title: action.title,
      description: action.description,
      cost: action.cost,
      scope: action.scope === "city" ? "Бүкіл қала" : "Бір аудан",
      target: action.scope === "city" ? "Барлық бес аудан" : districtNames.get(action.districtId!),
      lagQuarters: action.lag,
      realizedShare: calculateRealizedShare(action),
      fullImpact: labelMetrics(action.impact),
      realizedImpactBeforeLimit: labelMetrics(Object.fromEntries(
        Object.entries(action.impact).map(([key, value]) => [key, value * calculateRealizedShare(action)]),
      )),
    })),
    score: {
      before: round(result.before.score),
      after: round(result.after.score),
      change: round(result.scoreChange),
    },
    formula: {
      district: "Он көрсеткіштің белгіленген салмақтармен өлшенген қосындысы",
      metricWeights: labelMetrics(METRIC_WEIGHTS),
      city: "0.7 × халық үлесімен өлшенген аудандық орташа + 0.3 × ең төмен аудандық ұпай − критикалық көрсеткіштер саны",
      critical: "Көрсеткіші қатаң түрде 40-тан төмен әр аудан-көрсеткіш жұбы үшін 1 ұпай шегеріледі",
      before: components(result.before),
      after: components(result.after),
      note: "Сервер толық дәлдікпен есептейді; мұнда көрсетуге арналған сандар дөңгелектелген. Қайта есептеме.",
    },
    metrics: {
      aggregation: "Халық үлесі бойынша өлшенген қалалық орташа",
      before: labelMetrics(result.before.averageMetrics),
      after: labelMetrics(result.after.averageMetrics),
      netChange: labelMetrics(Object.fromEntries(METRIC_KEYS.map((key) => [
        key, result.after.averageMetrics[key] - result.before.averageMetrics[key],
      ]))),
    },
    synergies: result.synergies.map((bonus) => ({
      actions: bonus.actionIds,
      district: districtNames.get(bonus.districtId),
      impact: labelMetrics(bonus.impact),
      note: "Бірлескен бонусқа кешігу коэффициенті қолданылмайды",
    })),
    districtSummary: {
      mostImproved: summary.mostImproved.name,
      needsAttention: summary.needsAttention.name,
      gapBefore: round(summary.gapBefore),
      gapAfter: round(summary.gapAfter),
    },
    actualDeclines: reports.flatMap((district) => METRIC_KEYS
      .filter((key) => district.metricChanges[key] < 0)
      .map((key) => ({
        district: district.name,
        metric: METRIC_LABELS[key],
        before: round(district.before[key]),
        after: round(district.after[key]),
        change: round(district.metricChanges[key]),
      }))),
    recommendationBoundary: "Тек осы бес таңдалған жобаның мерзімін, сапасын, қолжетімділігін, күтімін немесе мониторингін жақсарту. Қосымша жоба ұсынбау: оның құны мен үйлесімділігі тексерілмеген.",
    districts: reports.map((district) => ({
      name: district.name,
      populationShare: district.populationShare,
      initialProfile: district.description,
      score: { before: round(district.beforeScore), after: round(district.afterScore), change: round(district.scoreChange) },
      metrics: {
        before: labelMetrics(district.before),
        after: labelMetrics(district.after),
        netChange: labelMetrics(district.metricChanges),
      },
      remainingPriority: METRIC_LABELS[district.remainingPriority],
      remainingPriorityState: {
        before: round(district.before[district.remainingPriority]),
        after: round(district.after[district.remainingPriority]),
        change: round(district.metricChanges[district.remainingPriority]),
      },
      actionEffectsBeforeLimit: district.actionEffects.map((effect) => ({
        action: effect.title,
        realizedShare: effect.realizedShare,
        impact: labelMetrics(effect.impact),
        districtScoreContribution: round(effect.scoreContribution),
      })),
      clamped: district.clamped,
    })),
  };
}

const schema = {
  type: "object",
  properties: {
    strengths: { type: "array", items: { type: "string" } },
    tradeoffs: { type: "array", items: { type: "string" } },
    recommendations: { type: "array", items: { type: "string" } },
  },
  required: ["strengths", "tradeoffs", "recommendations"],
  additionalProperties: false,
};

export function parseExplanation(value: unknown): AIExplanation {
  if (!value || typeof value !== "object") throw new Error("Invalid AI response");
  const record = value as Record<string, unknown>;
  for (const key of ["strengths", "tradeoffs", "recommendations"] as const) {
    const list = record[key];
    if (
      !Array.isArray(list) || list.length < 1 ||
      list.length > (key === "recommendations" ? 2 : 4) ||
      !list.every((item) => typeof item === "string" && item.trim().length > 0 && item.length <= 1500)
    ) throw new Error("Invalid AI section");
  }
  return {
    strengths: record.strengths as string[],
    tradeoffs: record.tradeoffs as string[],
    recommendations: record.recommendations as string[],
  };
}

/** Server-only: credentials stay on the server, and the model only explains. */
export async function generateExplanation(result: SimulationResult): Promise<AIExplanation> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  if (model !== "gpt-4o-mini" && model !== "gpt-4o") throw new Error("Unsupported model");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(35_000),
    cache: "no-store",
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 2200,
      response_format: {
        type: "json_schema",
        json_schema: { name: "city_analysis", strict: true, schema },
      },
      messages: [
        {
          role: "system",
          content: "Сен «5 сағатқа әкім» қалалық симуляторының кеңесшісісің. Тек қазақ тілінде жаз. Барлық score, метрика, әсер және бонус серверде есептелген: оларды қайта есептеме, өзгертпе және жаңа сандар ұсынба. Бұл — синтетикалық деректерге негізделген шартты модель, ресми статистика немесе ғылыми болжам емес. Барлық он метрикада жоғары ұпай жақсы: жол қолайлылығы өскені кептеліс азайғанын, ауа сапасы өскені ауаның жақсарғанын білдіреді. Бюджет 100 шартты бірлік, ақша бірлігін теңгеге ауыстырма. Шешімдер барлығы бес: бес бағыттың әрқайсысынан дәл бір іс-шара міндетті. Аудандық шара тек көрсетілген ауданға, қалалық шара барлық бес ауданға әсер етеді. Уақыт көкжиегі 8 тоқсан: әсерге іске қосылу кешігуі ескерілген, бірақ бірлескен бонустар толық қосылған. strengths: 2–3 нақты күшті жағы; tradeoffs: 2–3 тәуекел мен ымыра; recommendations: 1–2 нақты ұсыныс. Нақты аудан атауларын қолдан: ең көп жақсарған және әлі назар қажет ауданды түсіндір. Бастапқы профильді соңғы күймен шатастырма. Критикалық көрсеткіштер мен ең әлсіз ауданның қорытындыға әсерін берілген деректерге сүйеніп түсіндір. Әр тармақ 1–2 қысқа сөйлем болсын. Таңдалған шараны қайта таңдауды ұсынба; оны іске асыруды, күтімді, қолжетімділікті немесе нәтижесін бақылауды жақсартуды ұсын. Есептелмеген сценарийдің score-ын, жаңа жобаның бағасын немесе әсерін ойдан шығарма. Берілген JSON схемасын сақта.",
        },
        { role: "user", content: JSON.stringify(buildAnalysisContext(result)) },
        {
          role: "system",
          content: "Дәлдік: metrics.netChange — халық үлесімен өлшенген нақты қалалық өзгеріс; districts[].metrics.netChange — аудан өзгерісі. actualDeclines тізімі бос болса, ешбір көрсеткіш төмендемеген: төмендеді, нашарлады, төмендеу көрсетуде деген тұжырымдарды қолданба. Төмен бастапқы деңгей мен төмендеу екі бөлек ұғым: өскен, бірақ әлі әлсіз көрсеткіш үшін «жақсарды, алайда деңгейі әлі төмен» деп жаз. Әлеуметтік инфрақұрылым мен көлік — бөлек бағыттар. Тәуекелдерде таңдалған шара жеткіліксіз болатын әлсіз көрсеткішті атауға болады, бірақ recommendations бөлімінде ТЕК таңдалған жобалардың сапасы, іске қосылу мерзімі, күтімі мен мониторингі туралы жаз. Жаңа жоба, қосымша шара, жаңа көлік бағыты немесе желілерді жаңарту сияқты таңдалмаған бастаманы ұсынба: оның бюджеті мен үйлесімділігі тексерілмеген. Әр ұсыныста таңдалған жобаның атауын ата. Жеке шараның кері әсерін басқа шара өтей алады. actionEffectsBeforeLimit пен synergies әсерлері 0–100 шектеуіне дейін берілген. districtScoreContribution тек аудан ұпайының үлесі; бұл қалалық қорытынды Score-дың жеке үлесі емес, себебі ең төмен аудан мен критикалық айып өзгеруі мүмкін. Қалған бюджет өздігінен бонус бермейді. Қосымша іске асыру тәуекелдерін тек ықтималдық ретінде ата. Қорытындыларды тек берілген шартты модель аясында түсіндір.",
        },
      ],
    }),
  });
  if (!response.ok) throw new Error(`OpenAI request failed (${response.status})`);
  const body = await response.json();
  const choice = body?.choices?.[0];
  if (choice?.finish_reason !== "stop" || choice?.message?.refusal || typeof choice?.message?.content !== "string")
    throw new Error("Incomplete AI response");
  return parseExplanation(JSON.parse(choice.message.content));
}
