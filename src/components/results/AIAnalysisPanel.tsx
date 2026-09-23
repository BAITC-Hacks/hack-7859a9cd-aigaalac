"use client";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  GitCompareArrows,
  LoaderCircle,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import type { AIAnalysis, SimulationResult } from "@/types";
import { analyzeResult } from "@/lib/api/analyze";
import { USE_MOCK_API } from "@/lib/api/client";
export default function AIAnalysisPanel({
  result,
}: {
  result: SimulationResult;
}) {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setAnalysis(null);
    setError(null);
    analyzeResult(result)
      .then((data) => {
        if (active) setAnalysis(data);
      })
      .catch((e) => {
        if (active)
          setError(e instanceof Error ? e.message : "Analysis unavailable.");
      });
    return () => {
      active = false;
    };
  }, [result, attempt]);
  const groups = analysis
    ? [
        {
          title: "Strengths",
          items: analysis.strengths,
          icon: CheckCircle2,
          color: "strengths",
        },
        {
          title: "Risks to consider",
          items: analysis.risks,
          icon: TriangleAlert,
          color: "risks",
        },
        {
          title: "Trade-offs",
          items: analysis.tradeoffs,
          icon: GitCompareArrows,
          color: "tradeoffs",
        },
      ]
    : [];
  return (
    <section className="panel analysis-panel">
      <div className="section-heading compact">
        <div className="analysis-title">
          <span className="icon-box">
            <Sparkles size={21} />
          </span>
          <div>
            <h2>Your city, explained</h2>
            <p>AI strategy analysis</p>
          </div>
        </div>
        <span className="analysis-badge">
          {USE_MOCK_API ? "EXAMPLE ANALYSIS" : "AI INSIGHTS"}
        </span>
      </div>
      {error ? (
        <div className="analysis-status" role="alert">
          <TriangleAlert size={26} />
          <p>{error}</p>
          <button
            className="button button-secondary"
            onClick={() => setAttempt((a) => a + 1)}
          >
            Retry analysis
          </button>
        </div>
      ) : !analysis ? (
        <div className="analysis-status" role="status">
          <LoaderCircle className="spin" size={26} />
          <p>Reviewing your city’s results…</p>
        </div>
      ) : (
        <>
          <p className="analysis-summary">{analysis.summary}</p>
          <div className="analysis-groups">
            {groups.map(({ title, items, icon: Icon, color }) => (
              <div className={`analysis-group ${color}`} key={title}>
                <h3>
                  <Icon size={17} />
                  {title}
                </h3>
                <ul>
                  {items.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
                {!items.length && <p className="small muted">None reported.</p>}
              </div>
            ))}
          </div>
          <div className="recommendation">
            <div>
              <Sparkles size={19} />
              <strong>The next move</strong>
              <ArrowUpRight size={18} />
            </div>
            <p>{analysis.recommendation}</p>
          </div>
        </>
      )}
    </section>
  );
}
