# Integration data contract

The frontend sends decisions to `POST /api/simulate` using this shape:

```json
{
  "decisions": [
    { "measureId": "M7", "districtId": "nura" },
    { "measureId": "M8", "districtId": "nura" },
    { "measureId": "M10", "districtId": "nura" },
    { "measureId": "M12", "districtId": null },
    { "measureId": "M5", "districtId": "saryarka" }
  ]
}
```

`districtId` is `null` or omitted only for a city-wide measure. The simulation endpoint is the authority on all validation and numeric results; client-supplied costs, effects and initial scores are ignored. The full rules and source data are in [dataset.md](dataset.md).

Exactly five decisions, no duplicates, budget ≤100, at most two per direction and all scope/conflict rules must pass. Invalid JSON/plans return HTTP 400 with `{ "valid": false, "error": "reason" }` (plan failures also include an `errors` array), never a calculated score.

After a successful simulation, send its **unaltered full response** to `POST /api/analyze`:

```ts
await fetch('/api/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ simulationResult }), // entire POST /api/simulate response
});
```

The result type is defined in `src/types/simulation.ts` and includes:

- `valid: true`, `datasetVersion: "astana-v1"`, canonical `decisions`, `horizonQuarters: 8`, `budgetSpent`, `budgetRemaining`.
- Unrounded `initialScore`, `finalScore`, `delta`, plus integer `criticalBefore`, `criticalAfter`.
- `districtsBefore` / `districtsAfter`, each containing all five district IDs and `{ score, populationShare, indicators }` with all ten numeric `T1…C2` fields.
- `indicatorDeltas`, containing all ten actual after-minus-before changes for every district.
- `appliedEffects`: one entry per selected measure with `measureId`, `measureName`, `cost`, `lag`, `factor`, `districtId`, and lag-adjusted `effects`. A `null` district means all five districts; the cost is paid once. Contributions are before the final cap.
- `synergies`: `{ measureIds: [first, second], districtId, effects }` entries. Bonuses apply only in the first measure's district, without lag scaling.

For the supplied reference: budget **95**, initialScore **52.55768**, finalScore **56.54307**, delta **3.98539**, critical **2 → 0**. Round only for display. Never substitute empty snapshot maps or drop contribution traces. OpenAI receives the indicator glossary and scoring interpretation in its system prompt and must use computed numbers unchanged.

Success response:

```json
{ "analysis": { "summary": "…", "strengths": ["…"], "risks": ["…"], "tradeoffs": ["…"], "recommendation": "…" } }
```

For the optional pre-decision advisor, call `POST /api/advisor`:

```json
{ "district": { "id": "nura", "name": "Nura", "indicators": { "S1": 38, "S2": 35 } } }
```

The advisor deliberately diagnoses a district and does not select a strategy for the user.

`NEXT_PUBLIC_USE_MOCK_API=true` is a key-free **rules-based explanation preview only**, clearly labelled as non-AI. It never mocks `/api/simulate` or returns fixed scores. Default `false` uses `/api/analyze`; missing credentials or upstream failures leave numeric results visible with an analysis error/retry state.
