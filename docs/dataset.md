# Supplied synthetic dataset — astana-v1

Source: the hackathon dataset supplied by the team for “Аким на 5 часов”. These are synthetic district conditions, not official measurements. No personal or restricted data is used. The interface translates labels into English but preserves IDs, quantities and rules.

## Indicators

All indicators range from 0 to 100; higher is better. Congestion and smog have already been inverted. Exactly 40 is not critical.

| Code | Direction | Meaning of 100 | Weight |
| --- | --- | --- | ---: |
| T1 | Transport | No peak-hour congestion (0 = gridlock) | 0.10 |
| T2 | Transport | Every resident within 500 m of a stop, interval ≤10 min | 0.10 |
| E1 | Environment | ≥20 m² of green space per resident | 0.09 |
| E2 | Environment | Winter AQI ≤50 (0 = chronic smog) | 0.11 |
| S1 | Social | School/kindergarten demand fully met, no second shift | 0.11 |
| S2 | Social | Full per-capita provision of clinics/primary care | 0.11 |
| B1 | Safety | Lighting/cameras everywhere, minimal incidents | 0.09 |
| B2 | Safety | Minimal injury-causing road crashes | 0.09 |
| C1 | Services | No heating/water failures during the year | 0.10 |
| C2 | Services | All resident requests resolved on time | 0.10 |

Direction weights: Transport 0.20, Environment 0.20, Social 0.22, Safety 0.18, Services 0.20; total 1.

## District baseline

| ID / district | Population share | T1 | T2 | E1 | E2 | S1 | S2 | B1 | B2 | C1 | C2 | Derived D |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| esil / Есиль | 0.27 | 45 | 62 | 68 | 72 | 48 | 55 | 78 | 60 | 75 | 70 | 62.99 |
| almaty / Алматы | 0.24 | 40 | 75 | 50 | 55 | 60 | 65 | 62 | 52 | 50 | 60 | 57.06 |
| saryarka / Сарыарка | 0.20 | 50 | 70 | 42 | 40 | 62 | 68 | 58 | 55 | 45 | 55 | 54.65 |
| baikonur / Байконур | 0.13 | 52 | 68 | 55 | 50 | 58 | 60 | 52 | 58 | 55 | 58 | 56.63 |
| nura / Нура | 0.16 | 55 | 40 | 45 | 65 | 38 | 35 | 55 | 50 | 60 | 50 | 49.18 |

Esil is affluent with bridge congestion and overcrowded schools. Almaty has aging utilities and congestion. Saryarka has private-sector smog and limited greenery. Baikonur has a balanced mid-range profile. Nura is the weakest in social provision and transport.

## Measures

Horizon **H=8 quarters** (2 years). Lag L is in quarters; realized fraction is `(8−L)/8`. District measures affect one chosen district; city measures affect all five, but their cost is counted once. Effects below are full effects before lag.

| ID | Direction | Measure | Scope | Cost | L | Full effects |
| --- | --- | --- | --- | ---: | ---: | --- |
| M1 | Transport | Dedicated bus lanes | District | 18 | 2 | T1 +6, T2 +9 |
| M2 | Transport | Adaptive traffic signals | City | 22 | 2 | T1 +4, B2 +3 |
| M3 | Transport | LRT line / extension | District | 30 | 4 | T1 +16, T2 +20, E2 +4 |
| M4 | Environment | Park / public garden | District | 15 | 2 | E1 +12, E2 +3, B1 +2 |
| M5 | Environment | Clean fuel for private-sector homes | District | 25 | 3 | E2 +14, C1 +4 |
| M6 | Environment | City greening and windbreaks | City | 20 | 4 | E1 +5, E2 +3 |
| M7 | Social | Modular school and kindergarten | District | 24 | 3 | S1 +16 |
| M8 | Social | Family health center / clinic | District | 20 | 3 | S2 +14 |
| M9 | Social | Courtyard sports hubs | District | 10 | 1 | S1 +3, S2 +3, B1 +3 |
| M10 | Safety | Lighting and cameras / Safe City | District | 12 | 1 | B1 +12, B2 +2 |
| M11 | Safety | Safe crossings and school zones | District | 10 | 1 | B2 +12, T1 −2 |
| M12 | Services | Unified resident-request platform | City | 14 | 1 | C2 +5 |
| M13 | Services | Heating/water network modernization | District | 28 | 4 | C1 +18, E2 +2 |
| M14 | Services | Emergency utility crews and early warning | City | 16 | 1 | C1 +5, C2 +2 |

Fixed bonuses when both measures are selected (never scaled by lag):

- M1 + M2: T1 +2 in M1's district.
- M10 + M12: B1 +2 in M10's district.
- M5 + M6: E2 +2 in M5's district.

Prohibited combinations:

- M1 + M3 anywhere, including different districts: bus rapid transit versus LRT.
- M4 + M7 in the same district: land conflict.
- M5 + M13 in the same district: duplicate program.

## Calculation

1. `I′[district, indicator] = clip(I + sum(fullEffects × (8−L)/8) + fixedBonuses, 0, 100)`. Accumulate everything before clipping, so order cannot change the result.
2. `D[district] = sum(weight[indicator] × I′[district, indicator])`.
3. `D_avg = sum(populationShare[district] × D[district])`.
4. `Score = 0.7 × D_avg + 0.3 × min(D) − N_crit`, where N_crit counts district/indicator pairs strictly below 40.

Baseline: D_avg **56.8624**, weakest district **49.18**, two critical pairs (Nura S1=38, S2=35), Score **52.55768**. Calculations do not round intermediates; UI shows two decimals.

## Validation and reference scenario

- Budget 100. Unspent credits give no bonus and are retained.
- Exactly five unique measures, at most two per direction (therefore at least three directions).
- Each district measure requires one valid district; city measures use no district (`null` or omitted in JSON).
- All prohibited combinations are rejected. Any invalid plan returns reasons and no score.
- Order is irrelevant; each run starts from the same fixed baseline.

Reference: M7(Nura), M8(Nura), M10(Nura), M12(city), M5(Saryarka). Cost **95**, score **56.54307**, delta **3.98539**, critical pairs **2 → 0**. M10+M12 gives Nura B1 +2. Final district scores: Esil 63.4275; Almaty 57.4975; Saryarka 56.3; Baikonur 57.0675; Nura 52.9625.

The cheapest example M9 + M11 + M10 + M12 + M4 costs **61** and is valid with valid district targets. LLM analysis receives calculated deltas and contributions; it must explain, not invent or recompute numbers.
