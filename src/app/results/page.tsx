"use client";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, ChartNoAxesCombined, CheckCircle2, LoaderCircle } from "lucide-react";
import { useSimulation } from "@/components/SimulationProvider";
import ScoreComparison from "@/components/results/ScoreComparison";
import ResultsChart from "@/components/results/ResultsChart";
import DistrictComparison from "@/components/results/DistrictComparison";
import AIAnalysisPanel from "@/components/results/AIAnalysisPanel";
import { USE_MOCK_API } from "@/lib/api/client";
export default function ResultsPage() {
 const { result, ready } = useSimulation();
 if (!ready) return <div className="page-content empty-state" role="status"><LoaderCircle className="spin"/>Loading your results…</div>;
 if (!result) return <div className="page-content"><div className="empty-state results-empty"><span className="empty-icon"><ChartNoAxesCombined size={36}/></span><div className="eyebrow">YOUR CITY’S NEXT CHAPTER</div><h1>Every result starts with a decision.</h1><p>Choose five initiatives and run your strategy to discover its impact.</p><Link href="/simulation" className="button button-primary">Build your strategy <ArrowUpRight size={18}/></Link></div></div>;
 return <div className="page-content"><div className="page-heading"><div><div className="eyebrow">YOUR DECISIONS. THEIR IMPACT.</div><h1>A new outlook for Astana.</h1><p>Explore how the city changed, district by district.</p></div><Link href="/simulation" className="button button-secondary"><ArrowLeft size={16}/> Refine your strategy</Link></div><div className="result-notice"><CheckCircle2 size={19}/><span><strong>{USE_MOCK_API ? "Demo simulation complete." : "Simulation complete."}</strong> {USE_MOCK_API ? "These are fixed example results, independent of your selected strategy." : "Your results are ready to explore."}</span></div><ScoreComparison result={result}/><div className="results-layout"><div className="results-main"><ResultsChart result={result}/><DistrictComparison result={result}/></div><AIAnalysisPanel result={result}/></div></div>;
}
