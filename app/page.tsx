import { simulationRepository } from "@/lib/data";
import { Simulator } from "@/components/simulator";

export default async function Home() {
  const [districts, actions] = await Promise.all([
    simulationRepository.getDistricts(),
    simulationRepository.getActions(),
  ]);
  return <Simulator districts={districts} actions={actions} />;
}
