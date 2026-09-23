import { MapPin } from "lucide-react";
import type { District } from "@/types";
import IndicatorBar from "./IndicatorBar";
export default function DistrictDetails({ district }: { district: District }) { return <section className="district-details" aria-label={`${district.name} indicators`}><div className="detail-title"><span className="icon-box"><MapPin size={20}/></span><div><h3>{district.name} at a glance</h3><p>{district.description}</p></div><span className="small muted">Below 40 = critical</span></div><div className="indicators-grid">{Object.entries(district.indicators).map(([label,value]) => <IndicatorBar key={label} label={label} value={value}/>)}</div></section>; }
