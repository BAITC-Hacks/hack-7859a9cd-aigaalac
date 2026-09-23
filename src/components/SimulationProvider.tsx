"use client";
import { createContext, useContext, useEffect, useState } from "react";
import type { Decision, SimulationResult } from "@/types";
import { isSimulationResult } from "@/lib/api/simulation";
import { USE_MOCK_API } from "@/lib/api/client";
import { measures } from "@/data/measures";
import { CITY_BUDGET, DECISION_LIMIT, districts } from "@/data/districts";
const key = `akim-session-${USE_MOCK_API ? "demo" : "live"}-v1`;
type Session = { decisions: Decision[]; result: SimulationResult | null; ready: boolean; setDecisions: (d: Decision[]) => void; setResult: (r: SimulationResult | null) => void };
const Context = createContext<Session | null>(null);
function validDecisions(value: unknown): value is Decision[] {
 if (!Array.isArray(value) || value.length > DECISION_LIMIT) return false;
 const ids = new Set<string>(); let spent = 0;
 return value.every(d => { const m = measures.find(m => m.id === d?.measureId); if (!m || ids.has(m.id)) return false; ids.add(m.id); spent += m.cost; return spent <= CITY_BUDGET && (m.scope === "city" ? d.districtId === null : districts.some(x => x.id === d.districtId)); });
}
export function SimulationProvider({ children }: { children: React.ReactNode }) {
 const [decisions, setDecisions] = useState<Decision[]>([]); const [result, setResult] = useState<SimulationResult | null>(null); const [ready, setReady] = useState(false);
 useEffect(() => { try { const saved = JSON.parse(sessionStorage.getItem(key) || "null"); if (saved && validDecisions(saved.decisions)) { setDecisions(saved.decisions); if (isSimulationResult(saved.result)) setResult(saved.result); } } catch { /* Unavailable or outdated session storage: start fresh. */ } setReady(true); }, []);
 useEffect(() => { if (ready) try { sessionStorage.setItem(key, JSON.stringify({ decisions, result })); } catch { /* The in-memory session remains usable. */ } }, [ready, decisions, result]);
 return <Context.Provider value={{ decisions, result, ready, setDecisions, setResult }}>{children}</Context.Provider>;
}
export function useSimulation() { const session = useContext(Context); if (!session) throw new Error("SimulationProvider is required"); return session; }
