# Integration data contract

The frontend sends decisions to `POST /api/simulate` using this shape:

```json
{ "decisions": [{ "measureId": "M7", "districtId": "nura" }] }
```

`districtId` is `null` or omitted only for a city-wide measure. The simulation endpoint is the authority on all validation and numeric results.

After a successful simulation, send its **unaltered full response** to `POST /api/analyze`:

```json
{ "simulationResult": { "valid": true, "initialScore": 52.56, "finalScore": 56.54, "delta": 3.98, "criticalBefore": 2, "criticalAfter": 0, "districtsBefore": {}, "districtsAfter": {}, "appliedEffects": [], "synergies": [] } }
```

Required AI input fields are `valid`, the five numeric score/critical fields, `districtsBefore`, and `districtsAfter`. Keep `appliedEffects` and `synergies` in the result so the analyst can explain changes without inventing causes.

Success response:

```json
{ "analysis": { "summary": "…", "strengths": ["…"], "risks": ["…"], "tradeoffs": ["…"], "recommendation": "…" } }
```

For the optional pre-decision advisor, call `POST /api/advisor`:

```json
{ "district": { "id": "nura", "name": "Nura", "indicators": { "S1": 38, "S2": 35 } } }
```

The advisor deliberately diagnoses a district and does not select a strategy for the user.
