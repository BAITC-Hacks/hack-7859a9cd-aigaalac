import Link from "next/link";
import AstanaMap from "@/components/map/AstanaMap";
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  ChartNoAxesCombined,
  Coins,
  Crosshair,
  Layers3,
  Leaf,
  MousePointer2,
  Sparkles,
} from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { CityIllustration } from "@/components/ui/CityIllustration";
import {
  districts,
  CITY_BUDGET,
  INITIAL_QOL,
  DECISION_LIMIT,
} from "@/data/districts";
const steps = [
  {
    icon: Crosshair,
    title: "Understand your city",
    text: "Explore five districts and find out where your attention matters most.",
  },
  {
    icon: MousePointer2,
    title: "Make your five decisions",
    text: "Choose initiatives, allocate your budget, and build a balanced strategy.",
  },
  {
    icon: Sparkles,
    title: "See your impact",
    text: "Run the simulation and explore the results with an AI-powered analysis.",
  },
];
export default function Home() {
  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <div className="eyebrow">WELCOME TO YOUR CITY</div>
          <h1>A little time. A lasting impact.</h1>
          <p>Step into the mayor’s office and shape the future of Astana.</p>
        </div>
        <span className="location-tag">
          <span /> Astana, Kazakhstan
        </span>
      </div>
      <section className="hero">
        <div className="hero-copy">
          <span className="hero-label">
            <span /> AI CITY MANAGEMENT SIMULATOR
          </span>
          <h2>
            Аким на
            <br />
            <span>5 часов</span>
            <span className="hero-period">.</span>
          </h2>
          <p>
            One city. Five decisions. A hundred possibilities.
            <br />
            Balance your budget, support your districts,
            <br className="desktop-break" /> and make life better for everyone.
          </p>
          <Link className="button button-light" href="/simulation">
            Начать управление <ArrowUpRight size={19} />
          </Link>
          <div className="hero-caption">
            Your city. Your strategy. Your impact.
          </div>
        </div>
        <div className="hero-art">
          <CityIllustration />
          <div className="city-label">
            <span /> ASTANA{" "}
            <span className="city-coordinates">51.1694° N · 71.4491° E</span>
          </div>
        </div>
      </section>
      <div className="stats-grid landing-stats">
        <StatCard
          label="Available budget"
          value={CITY_BUDGET}
          suffix="credits"
          detail="Invest where it matters most"
          icon={Coins}
        />
        <StatCard
          label="City districts"
          value={districts.length.toString().padStart(2, "0")}
          suffix="districts"
          detail="Different needs. One shared future."
          icon={Building2}
        />
        <StatCard
          label="Your decisions"
          value={DECISION_LIMIT.toString().padStart(2, "0")}
          suffix="initiatives"
          detail="Five choices to move the city forward"
          icon={Layers3}
        />
        <StatCard
          label="Current quality of life"
          value={INITIAL_QOL}
          suffix="/ 100"
          detail="Your starting point for a better city"
          icon={ChartNoAxesCombined}
          accent
        />
      </div>
      <AstanaMap />
      <section className="how-section">
        <div className="section-heading">
          <div>
            <div className="eyebrow">THE MAYOR’S PLAYBOOK</div>
            <h2>Big changes start with small decisions.</h2>
          </div>
          <span className="muted small">
            A simple mission. A meaningful challenge.
          </span>
        </div>
        <div className="steps-grid">
          {steps.map(({ icon: Icon, title, text }, i) => (
            <article className="step-card" key={title}>
              <div className="step-top">
                <span className="step-icon">
                  <Icon size={22} />
                </span>
                <span className="step-number">0{i + 1}</span>
              </div>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>
      <div className="bottom-callout">
        <span className="callout-icon">
          <Leaf size={23} />
        </span>
        <div>
          <strong>A thriving city is a balanced city.</strong>
          <p>
            Think beyond the numbers. Every district and every decision counts.
          </p>
        </div>
        <Link href="/simulation">
          Explore your city <ArrowRight size={17} />
        </Link>
      </div>
    </div>
  );
}
