"use client";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { districts } from "@/data/districts";
import type { SimulationResult } from "@/types";
export default function ResultsChart({ result }: { result: SimulationResult }) {
 const data = districts.map(d => ({ name: d.name, Before: result.districtsBefore[d.id]?.score, After: result.districtsAfter[d.id]?.score }));
 return <section className="panel chart-panel"><div className="section-heading compact"><div><h2>A healthier outlook for your city</h2><p>Quality of life across all five districts</p></div><div className="chart-legend"><span><i/>Before</span><span><i/>After</span></div></div><div className="results-chart" role="img" aria-label="District quality of life before and after simulation. Exact values appear in the table below."><ResponsiveContainer width="100%" height="100%" minWidth={0}><BarChart data={data} barGap={6} margin={{top:20,right:8,bottom:5,left:-22}} accessibilityLayer><CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e7ecea"/><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill:'#71827c',fontSize:12}} dy={8}/><YAxis domain={[0,100]} axisLine={false} tickLine={false} tick={{fill:'#71827c',fontSize:12}}/><Tooltip cursor={{fill:'#f3f7f5'}} contentStyle={{borderRadius:12,border:'1px solid #e3eae6',fontSize:13}}/><Bar dataKey="Before" fill="#d8e4de" radius={[5,5,0,0]} maxBarSize={34}/><Bar dataKey="After" fill="#16836b" radius={[5,5,0,0]} maxBarSize={34}/></BarChart></ResponsiveContainer></div></section>;
}
