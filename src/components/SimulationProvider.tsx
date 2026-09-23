"use client";
import { createContext, useContext, useEffect, useState } from "react";
import type { Decision, SimulationResult } from "@/types";
import { isSimulationResult } from "@/lib/api/simulation";
import { USE_MOCK_API } from "@/lib/api/client";
import { DATASET_VERSION } from "@/data/districts";
import { validateDecisions } from "@/lib/simulation/validator";
const key = `akim-session-${DATASET_VERSION}-${USE_MOCK_API ? "preview" : "live"}-v2`;
type Session = {
  decisions: Decision[];
  result: SimulationResult | null;
  ready: boolean;
  setDecisions: (d: Decision[]) => void;
  setResult: (r: SimulationResult | null) => void;
};
const Context = createContext<Session | null>(null);
function validDecisions(value: unknown): value is Decision[] {
  return validateDecisions(value, { requireComplete: false }).valid;
}
export function SimulationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [decisions, setStoredDecisions] = useState<Decision[]>([]);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(key) || "null");
      if (saved && validDecisions(saved.decisions)) {
        setStoredDecisions(saved.decisions);
        const complete = validateDecisions(saved.decisions);
        if (
          complete.valid &&
          isSimulationResult(saved.result) &&
          JSON.stringify(complete.decisions) ===
            JSON.stringify(saved.result.decisions)
        ) {
          setResult(saved.result);
        }
      }
    } catch {
      /* Unavailable or outdated session storage: start fresh. */
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready)
      try {
        sessionStorage.setItem(key, JSON.stringify({ decisions, result }));
      } catch {
        /* The in-memory session remains usable. */
      }
  }, [ready, decisions, result]);
  function updateDecisions(next: Decision[]) {
    setStoredDecisions(next);
    // Results belong to the strategy that produced them, not a later draft.
    setResult(null);
  }
  return (
    <Context.Provider
      value={{
        decisions,
        result,
        ready,
        setDecisions: updateDecisions,
        setResult,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useSimulation() {
  const session = useContext(Context);
  if (!session) throw new Error("SimulationProvider is required");
  return session;
}
