/** Visual identity only. These decorative landmarks never change the simulation. */
export type DistrictLandmarkKind = "expo" | "khan-shatyr" | "station" | "palace" | "zheruyik";

export interface DistrictIdentity {
  landmark: DistrictLandmarkKind;
  landmarkName: string;
  description: string;
  accent: string;
  buildingColors: readonly string[];
  roofColor: string;
  plazaColor: string;
}

export const DISTRICT_IDENTITIES: Readonly<Record<string, DistrictIdentity>> = {
  esil: {
    landmark: "expo", landmarkName: "ЭКСПО · «Нұр Әлем»",
    description: "Көк шыны шар, көрме павильондары және заманауи сәулет.",
    accent: "#318ca4", buildingColors: ["#a9cfda", "#bfdae0", "#86b2c3"],
    roofColor: "#326478", plazaColor: "#d5e5e3",
  },
  almaty: {
    landmark: "zheruyik", landmarkName: "«Жерұйық» саябағы",
    description: "Ағашты аллея, саябақ алаңы және жасыл тұрғын орамдар.",
    accent: "#527a53", buildingColors: ["#d0d9c2", "#e3e7d6", "#b7caba"],
    roofColor: "#668575", plazaColor: "#d4e2c5",
  },
  saryarka: {
    landmark: "station", landmarkName: "«Астана-1» вокзалы",
    description: "Теміржол, вокзал алаңы және кірпіш түсті ескі қала үйлері.",
    accent: "#a86d4e", buildingColors: ["#d7ac8a", "#e4c8a7", "#c99576"],
    roofColor: "#8d6855", plazaColor: "#e5d7c0",
  },
  baikonur: {
    landmark: "palace", landmarkName: "«Жастар» сарайы",
    description: "Мәдениет сарайы, бағаналы қасбет және кең қоғамдық алаң.",
    accent: "#647898", buildingColors: ["#c2cdd6", "#d9dfe0", "#aabdc9"],
    roofColor: "#607384", plazaColor: "#dce1d7",
  },
  nura: {
    landmark: "khan-shatyr", landmarkName: "«Хан Шатыр»",
    description: "Керілген шатыр, кең алаң және жаңа тұрғын орамдар.",
    accent: "#ab8848", buildingColors: ["#dfcfaa", "#e8ddc4", "#d6c49c"],
    roofColor: "#a88b59", plazaColor: "#e8dec2",
  },
};
