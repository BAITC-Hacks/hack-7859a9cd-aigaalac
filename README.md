# Аким на 5 часов — AI City Management Simulator

A Next.js simulator using the supplied synthetic Astana dataset: five districts, ten indicators, fourteen initiatives and a shared budget of 100. Every valid strategy of exactly five decisions is calculated deterministically over eight quarters. OpenAI explains the calculated outcomes, trade-offs and risks; it does not calculate the score.

## Run

Requires **Node.js 22.18+** (native TypeScript test support; Node 24 LTS recommended).

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. Validate with `npm run typecheck`, `npm run build`, and `npm test`. Dev and build use Next.js’s supported Webpack bundler because this workspace blocks Turbopack’s CSS worker port.

For AI analysis, set a server-only `OPENAI_API_KEY` in `.env.local`. Numeric simulation requires no external API or key. Optional `OPENAI_MODEL` defaults to `gpt-4o-mini`. Never commit credentials.

Browser tests: `npm run test:e2e` (requires local Google Chrome). They use the real simulation server on ports 3100 and 3101; AI replies are previewed or intercepted, so no paid OpenAI requests are made. Tests cover the reference score, changed decisions, server validation, session restoration, mobile layout and error recovery. `npm test` runs dataset-fidelity, validator, scoring, simulation, route and AI contract tests.

For production: `npm run build` followed by `npm start`.

## Pages and components

- `/`: landing page and city baseline.
- `/simulation`: all 50 source indicators, fourteen initiatives across five directions, targeting, budget, category and incompatibility validation.
- `/results`: calculated scores, district charts, all indicator deltas, lag-adjusted measure contributions, fixed synergy bonuses and AI analysis with independent loading/error/retry states.

Frontend page implementations live in `src/app/`; reusable components live in `src/components/`. Root `app/` page files re-export the frontend pages because this repository already has API routes in the root app directory. Next.js uses that root app directory. Empty `src/app/api` placeholders are not active routes.

A small React context shares decisions and results between pages. Session storage is versioned by dataset and analysis mode. Editing decisions clears the previous result; outdated demo sessions are not reused. No authentication or database is used.

## Dataset and calculation

- `docs/dataset.md`: complete supplied synthetic dataset, formulas and rules.
- `src/data/districts.ts`: all five baseline snapshots, population shares, derived district/city scores and shared constants.
- `src/data/indicators.ts`: all ten codes, labels, meanings and weights. Higher always means better, including traffic flow and air quality.
- `src/data/measures.ts`, `synergies.ts`, `incompatibilities.ts`: all fourteen numeric measures and all three bonus/conflict pairs.
- `src/lib/simulation/`: shared validator and pure deterministic engine. No model calls.
- `src/types/`: typed indicators, district snapshots, decisions and complete result traces.
- `src/data/mockResults.ts`: a **calculated reference fixture for tests only**; it is never used as the user's simulation response.

Effects are multiplied by `(8 − lag)/8`, then fixed synergy bonuses are added, then indicators are clipped to `[0, 100]`. District scores use the ten supplied weights. `Score = 0.7 × populationWeightedAverage + 0.3 × weakestDistrict − criticalIndicatorCount`, where critical means **strictly below 40**. Calculation preserves precision; only display values are rounded.

Reference demo: select **M7, M8, M10 in Nura; M12 city-wide; M5 in Saryarka**. Cost **95**, baseline **52.55768**, final **56.54307** (display **56.54**), delta **3.98539**, critical indicators **2 → 0**, synergy **M10 + M12** adds `B1 +2` in Nura. The rounded delta is **3.99**; subtracting already-rounded displayed scores instead would give 3.98, so do not round intermediate calculations.

## API and optional key-free preview

Normal mode (default):

```dotenv
NEXT_PUBLIC_USE_MOCK_API=false
```

Set this flag to `true` only for a clearly labelled **rules-based explanation preview, not AI**. Both modes use the same real `/api/simulate` endpoint and exact dataset; scores always depend on the selected decisions. Restart the dev server (or rebuild production) after changing the flag. Preview mode does not satisfy the live-AI requirement by itself.

- `app/api/simulate/route.ts`: validates untrusted decisions, derives all costs/effects from the server dataset and returns calculated results. Invalid plans return HTTP 400 with reasons and **no score**.
- `src/lib/api/simulation.ts`: `simulateStrategy(decisions)` always sends `POST /api/simulate` with `{ decisions }`. Every decision is `{ measureId: string, districtId: string | null }`. City-wide initiatives use `null` (the server also accepts an omitted district).
- `src/lib/api/analyze.ts`: `analyzeResult(result)` sends the complete, unaltered simulation response to `POST /api/analyze` as `{ simulationResult: result }`, then reads `{ analysis }`.
- `src/lib/api/client.ts`: shared fetch, timeout, error handling and mock toggle.

The AI receives before/after indicators, exact scores, decisions, costs, realized effects and bonuses. AI errors never replace calculated scores with a mock result. Optional `/api/advisor` diagnoses a district; it is not connected to a frontend control. See `docs/data-contract.md` for the shared contract.

A user must choose exactly five unique initiatives within 100 credits, at most two from one direction, with valid targeting and no prohibited combinations. All five directions are available; one from each direction is **not** required. The shared validator gives immediate UI feedback and enforces the same rules again on the server. Decision order is irrelevant and every run starts from the original baseline.

## 3D city explorer and themes

The landing page and dashboard include a real geographic Astana map with MapLibre GL, OpenFreeMap vector tiles, and OpenStreetMap building footprints/heights. Drag to pan, scroll to zoom, and right-drag to rotate. The 2D/3D toggle, reset, and all-district overview provide camera shortcuts. Hover buildings for mapped details; hover, focus, or click district pins/buttons for simulator indicators. Clicking a district on the dashboard synchronizes the existing district cards and details.

- Map component and controls: `src/components/map/`
- Map camera, styles, and approximate district focus coordinates: `src/data/map.ts`
- Building extrusion layer: `src/lib/map/layers.ts`
- Theme provider/toggle: `src/components/theme/`
- Theme palette and shared visual refinements: `src/app/theme.css`
- Map styling: `src/components/map/map.css`

District pins are demo focus points, not official district boundaries. Map tiles require an internet connection and the map requires WebGL. District information remains usable if the map fails. No API key is needed. Map source documentation: [OpenFreeMap](https://openfreemap.org/quick_start/) and [MapLibre 3D buildings](https://maplibre.org/maplibre-gl-js/docs/examples/display-buildings-in-3d/).

The header sun/moon button switches light/dark mode across all pages, chart colors, and map tiles. It initially follows the system preference and remembers explicit choices in local storage.

MapLibre v6 worker assets are copied from the installed package into `public/maplibre/` automatically by `predev` and `prebuild`. These generated files are ignored by Git. Deploy the `public/` assets along with the Next.js build.

Run `npm run test:map` for focused Chrome checks covering theme persistence, district hover/selection, actual 3D map loading, camera controls, building hover information, and mobile/offline fallback.
