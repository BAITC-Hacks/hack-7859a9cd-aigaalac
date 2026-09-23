import type { SimulationResult } from "@/types";
import { districts } from "@/data/districts";
import { INDICATOR_IDS, INDICATOR_LABELS } from "@/data/indicators";

const signed = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(2)}`;

export default function SimulationDetails({
  result,
}: {
  result: SimulationResult;
}) {
  return (
    <section className="panel simulation-details">
      <div className="section-heading compact">
        <div>
          <h2>How your decisions changed the city</h2>
          <p>All ten indicators, weighted by population. Higher is better.</p>
        </div>
      </div>
      <p className="small muted">
        Score = 70% population-weighted district score + 30% weakest district
        score − number of indicators below 40. Indicators are capped at 0–100
        after all effects and bonuses.
      </p>
      {districts.map((district) => (
        <details key={district.id} className="indicator-breakdown">
          <summary>
            {district.name} · {(district.populationShare * 100).toFixed(0)}%
            population · {result.districtsBefore[district.id].score.toFixed(2)}{" "}
            → {result.districtsAfter[district.id].score.toFixed(2)}
          </summary>
          <div className="table-wrapper">
            <table aria-label={`${district.name} indicator changes`}>
              <thead>
                <tr>
                  <th>Indicator</th>
                  <th>Before</th>
                  <th>After</th>
                  <th>Change</th>
                </tr>
              </thead>
              <tbody>
                {INDICATOR_IDS.map((key) => (
                  <tr key={key}>
                    <th scope="row">
                      {key} · {INDICATOR_LABELS[key]}
                    </th>
                    <td>
                      {result.districtsBefore[district.id].indicators[
                        key
                      ].toFixed(2)}
                    </td>
                    <td>
                      {result.districtsAfter[district.id].indicators[
                        key
                      ].toFixed(2)}
                      {result.districtsAfter[district.id].indicators[key] < 40
                        ? " · Critical"
                        : ""}
                    </td>
                    <td>{signed(result.indicatorDeltas[district.id][key])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ))}
      <h3>Applied effects</h3>
      <p className="small muted">
        Lag-adjusted contributions before the final 0–100 cap. City-wide effects
        apply in every district.
      </p>
      <ul className="effect-trace">
        {result.appliedEffects.map((effect) => (
          <li key={effect.measureId}>
            <strong>
              {effect.measureId} · {effect.measureName}
            </strong>
            <span>
              {effect.districtId
                ? districts.find((d) => d.id === effect.districtId)?.name
                : "City-wide"}{" "}
              · {effect.cost} credits · {effect.lag}-quarter lag ·{" "}
              {effect.factor * 100}% effect
            </span>
            <span>
              {Object.entries(effect.effects)
                .map(([key, value]) => `${key} ${signed(value)}`)
                .join("; ")}
            </span>
          </li>
        ))}
      </ul>
      <h3>Synergies</h3>
      {result.synergies.length ? (
        <ul className="effect-trace">
          {result.synergies.map((synergy) => (
            <li key={synergy.measureIds.join("-")}>
              <strong>
                {synergy.measureIds.join(" + ")} ·{" "}
                {districts.find((d) => d.id === synergy.districtId)?.name}
              </strong>
              <span>
                {Object.entries(synergy.effects)
                  .map(([key, value]) => `${key} ${signed(value)}`)
                  .join("; ")}{" "}
                · fixed bonus, no lag scaling
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p>No synergy pairs selected.</p>
      )}
    </section>
  );
}
