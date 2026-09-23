# Аким на 5 часов — frontend

A responsive Next.js App Router, TypeScript, Tailwind CSS and Recharts interface for the AI City Management Simulator.

## Run

```sh
npm install
npm run dev
```

Open http://localhost:3000. Validate with `npm run typecheck`, `npm run build`, and `npm test`. Dev and build use Next.js’s supported Webpack bundler because this workspace blocks Turbopack’s CSS worker port.

Optional browser tests: `npm run test:e2e` (requires local Google Chrome). They run demo and live-API modes on ports 3100 and 3101, intercepting API calls to check payloads and error recovery. They cover district navigation, all filters, search, fixed-cost selection, budget limits, exactly five decisions, refresh, stale-result clearing, and request/error handling.

## Pages and components

- `/`: landing page and city baseline.
- `/simulation`: district indicators, searchable/category-filtered initiative catalog, district targeting, budget tracking and a five-decision strategy.
- `/results`: score summaries, district comparison, Recharts visualization and AI analysis with independent loading/error/retry states.

Frontend page implementations live in `src/app/`; reusable components live in `src/components/`. Root `app/` page files re-export the frontend pages because this repository already has API routes in the root app directory. Next.js uses that root app directory. Empty `src/app/api` placeholders are not active routes.

A small React context shares decisions and results between pages. Session storage restores them after refresh; demo and live sessions are separate. No Redux, authentication or database is used.

## Change display data

- `src/data/districts.ts`: five district snapshots, indicators, budget, initial QoL and decision limit.
- `src/data/measures.ts`: initiatives, categories, costs, lag, scope and display effects.
- `src/data/mockResults.ts`: fixed example simulation and AI analysis responses.
- `src/types/index.ts`: frontend types and expected response shape.

The district and initiative catalog is demo data. Coordinate final identifiers and snapshots with the backend team. Effects are display-only text. No simulation formulas or AI logic are implemented in the frontend. Mock results do not change with selections.

## Connect the backend

Copy `.env.example` to `.env.local`, then set:

```dotenv
NEXT_PUBLIC_USE_MOCK_API=false
```

Restart the dev server (or rebuild production) after changing this public environment variable. By default, mocks are enabled, and no backend requests are sent.

- `src/lib/api/simulation.ts`: `simulateStrategy(decisions)` sends `POST /api/simulate` with `{ decisions }`. Every decision remains `{ measureId: string, districtId: string | null }`. City-wide initiatives always use `null`.
- `src/lib/api/analyze.ts`: `analyzeResult(result)` sends the complete, unaltered simulation response to `POST /api/analyze` as `{ simulationResult: result }`, then reads `{ analysis }`.
- `src/lib/api/client.ts`: shared fetch, timeout, error handling and mock toggle.

The backend team should implement `app/api/simulate/route.ts` or route `/api/simulate` to their service. The existing `app/api/analyze/route.js` is preserved. API keys stay server-side. See `docs/data-contract.md` for the shared contract; district before/after snapshots used by the UI must each include a numeric `score`.

A user can select each initiative once, choose exactly five within 100 credits, and remove or revise choices before running. The backend remains responsible for authoritative validation and all numerical simulation outcomes. Invalid responses and request failures are shown without fabricating fallback results.

## 3D city explorer and themes

The landing page includes a real geographic Astana map with MapLibre GL, OpenFreeMap vector tiles, and OpenStreetMap building footprints/heights. Drag to pan, scroll to zoom, and right-drag to rotate. The 2D/3D toggle, reset, and all-district overview provide camera shortcuts. Hover buildings for mapped details; hover, focus, or click district pins/buttons for simulator indicators. The simulation page temporarily omits the map and uses the five district cards as its main navigation. All map components, styling, coordinates, and layer code are preserved unchanged for restoration.

- Map component and controls: `src/components/map/`
- Map camera, styles, and approximate district focus coordinates: `src/data/map.ts`
- Building extrusion layer: `src/lib/map/layers.ts`
- Theme provider/toggle: `src/components/theme/`
- Theme palette and shared visual refinements: `src/app/theme.css`
- Map styling: `src/components/map/map.css`

District pins are demo focus points, not official district boundaries. Map tiles require an internet connection and the map requires WebGL. District information remains usable if the map fails. No API key is needed. Map source documentation: [OpenFreeMap](https://openfreemap.org/quick_start/) and [MapLibre 3D buildings](https://maplibre.org/maplibre-gl-js/docs/examples/display-buildings-in-3d/).

The demo currently uses a fixed light theme on all pages. The header theme toggle is hidden. Theme components, dark styles, and saved preferences are retained. To restore switching later, remove `forcedTheme="light"` from `app/layout.tsx`, restore the `themeInitScript` setup there, and render `ThemeToggle` in `AppShell.tsx`.

MapLibre v6 worker assets are copied from the installed package into `public/maplibre/` automatically by `predev` and `prebuild`. These generated files are ignored by Git. Deploy the `public/` assets along with the Next.js build.

Run `npm run test:map` for focused Chrome checks covering the retained landing-page map, district hover/selection, actual 3D map loading, camera controls, building hover information, light-theme lock, and mobile/offline fallback.

## Current hackathon demo flow

`100 credits → inspect district cards → choose initiatives and required target districts → review exactly five decisions → Run Simulation → results`

Costs are fixed catalog values; there is no manual allocation control. Editing a strategy clears its previous simulation result so a new draft cannot accidentally display an old outcome. Session restoration is shown separately from a running simulation.

All original demo values are unchanged: district QoL/indicators and initial city QoL in `src/data/districts.ts`, initiative costs/lag/effects in `src/data/measures.ts`, and fixed outcome/analysis fixtures in `src/data/mockResults.ts`. The 100-credit limit, five-decision requirement, and five simulator districts are the specified game setup. Budget and decision counters reflect the user's actual selections from that provisional catalog. In real API mode, the frontend waits for `/api/simulate` to return the backend-calculated result before navigating to `/results`.

Simulation-only visual styles live in `src/app/simulation/simulation.css`. To restore the dashboard map later, re-import `AstanaMap` in the simulation page and pass its existing `districtId`/`setDistrictId` state as `selectedDistrictId`/`onDistrictSelect`.
