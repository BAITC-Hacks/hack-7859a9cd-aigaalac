import { ArrowRight, Check, Layers3, LoaderCircle, Trash2 } from "lucide-react";
import type { Decision } from "@/types";
import { CITY_BUDGET, DECISION_LIMIT, districts } from "@/data/districts";
import { measures } from "@/data/measures";
export default function StrategyPanel({
  decisions,
  spent,
  busy,
  error,
  onRemove,
  onRun,
}: {
  decisions: Decision[];
  spent: number;
  busy: boolean;
  error: string | null;
  onRemove: (index: number) => void;
  onRun: () => void;
}) {
  return (
    <aside className="strategy-panel">
      <div className="strategy-title">
        <span className="icon-box">
          <Layers3 size={20} />
        </span>
        <h2>Your strategy</h2>
        <span className="count-pill">
          {decisions.length}/{DECISION_LIMIT}
        </span>
      </div>
      <p className="strategy-intro">Five decisions to make a difference.</p>
      <div className="decision-slots">
        {Array.from({ length: DECISION_LIMIT }, (_, index) => {
          const d = decisions[index];
          const m = d && measures.find((m) => m.id === d.measureId);
          return (
            <div className={`decision-slot ${m ? "filled" : ""}`} key={index}>
              <span className="slot-number">
                {m ? <Check size={14} /> : `0${index + 1}`}
              </span>
              {m ? (
                <>
                  <div>
                    <strong>{m.name}</strong>
                    <span>
                      {districts.find((x) => x.id === d.districtId)?.name ??
                        "City-wide"}{" "}
                      · {m.cost} credits
                    </span>
                  </div>
                  <button
                    className="icon-button"
                    disabled={busy}
                    onClick={() => onRemove(index)}
                    aria-label={`Remove ${m.name}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </>
              ) : (
                <span>Choose an initiative</span>
              )}
            </div>
          );
        })}
      </div>
      <div className="budget-summary">
        <div>
          <span>Budget used</span>
          <strong>
            {spent}
            <span className="muted"> / {CITY_BUDGET}</span>
          </strong>
        </div>
        <div className="budget-track">
          <span style={{ width: `${spent}%` }} />
        </div>
        <div>
          <span>Remaining budget</span>
          <strong className="teal">{CITY_BUDGET - spent} credits</strong>
        </div>
      </div>
      <button
        className="button button-primary run-button"
        disabled={
          decisions.length !== DECISION_LIMIT || spent > CITY_BUDGET || busy
        }
        onClick={onRun}
      >
        {busy ? (
          <>
            <LoaderCircle className="spin" size={17} /> Running simulation…
          </>
        ) : (
          <>
            Run Simulation <ArrowRight size={17} />
          </>
        )}
      </button>
      <p className="run-hint" aria-live="polite">
        {decisions.length === DECISION_LIMIT
          ? "Your strategy is ready. Let’s see its impact."
          : `Select ${DECISION_LIMIT - decisions.length} more initiative${DECISION_LIMIT - decisions.length === 1 ? "" : "s"} to run.`}
      </p>
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      <div className="strategy-tip">
        <strong>A mayor’s perspective</strong>
        <p>
          Look for the gaps. Supporting a district’s weakest indicators can make
          a real difference.
        </p>
      </div>
    </aside>
  );
}
