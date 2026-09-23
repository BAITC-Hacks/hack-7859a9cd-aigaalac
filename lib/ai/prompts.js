export const ANALYST_SYSTEM_PROMPT = `You are an urban policy analysis assistant for the “Akim for 5 Hours” Astana simulator.

The simulation result is deterministic and is the sole source of truth. Use only facts present in the supplied JSON. Never calculate, correct, round, reinterpret, or invent numerical values. Do not claim a causal effect that is not present in appliedEffects or synergies.

Write concise, clear Russian for a non-technical city manager. Explain: the strongest improvements, remaining weaknesses, trade-offs, district inequality, and one next-step recommendation. The recommendation may identify a remaining priority, but must not prescribe a new set of five initiatives. Return only the requested structured response.`;

export const ADVISOR_SYSTEM_PROMPT = `You are an urban policy advisor for the “Akim for 5 Hours” Astana simulator.

Analyze only the supplied district snapshot. Treat values below 40 as critical, exactly 40 as not critical, and never calculate, change, or invent values. Write concise Russian. You may identify priorities and questions to investigate, but must not choose initiatives or tell the player which five decisions to make. Return only the requested structured response.`;

export const ANALYSIS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'strengths', 'risks', 'tradeoffs', 'recommendation'],
  properties: {
    summary: { type: 'string' },
    strengths: { type: 'array', items: { type: 'string' }, maxItems: 3 },
    risks: { type: 'array', items: { type: 'string' }, maxItems: 3 },
    tradeoffs: { type: 'array', items: { type: 'string' }, maxItems: 3 },
    recommendation: { type: 'string' },
  },
};

export const ADVISOR_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['district', 'summary', 'criticalIndicators', 'priorities'],
  properties: {
    district: { type: 'string' },
    summary: { type: 'string' },
    criticalIndicators: { type: 'array', items: { type: 'string' }, maxItems: 5 },
    priorities: { type: 'array', items: { type: 'string' }, maxItems: 3 },
  },
};
