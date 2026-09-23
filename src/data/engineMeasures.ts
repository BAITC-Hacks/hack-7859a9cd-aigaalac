import type { Measure } from "@/types/measure";

export const simulationSimulationMeasures: Record<string, Measure> = {
  M1: {
    id: "M1",
    name: "Выделенные полосы для автобусов",
    category: "transport",
    type: "district",
    cost: 18,
    lag: 2,
    effects: { T1: 6, T2: 9 },
  },

  M2: {
    id: "M2",
    name: "Умные светофоры",
    category: "transport",
    type: "city",
    cost: 22,
    lag: 2,
    effects: { T1: 4, B2: 3 },
  },

  M3: {
    id: "M3",
    name: "Линия ЛРТ / расширение",
    category: "transport",
    type: "district",
    cost: 30,
    lag: 4,
    effects: { T1: 16, T2: 20, E2: 4 },
  },

  M4: {
    id: "M4",
    name: "Парк / сквер",
    category: "ecology",
    type: "district",
    cost: 15,
    lag: 2,
    effects: { E1: 12, E2: 3, B1: 2 },
  },

  M5: {
    id: "M5",
    name: "Перевод частного сектора на чистое топливо",
    category: "ecology",
    type: "district",
    cost: 25,
    lag: 3,
    effects: { E2: 14, C1: 4 },
  },

  M6: {
    id: "M6",
    name: "Городская программа озеленения и ветрозащитных полос",
    category: "ecology",
    type: "city",
    cost: 20,
    lag: 4,
    effects: { E1: 5, E2: 3 },
  },

  M7: {
    id: "M7",
    name: "Школа + детсад",
    category: "social",
    type: "district",
    cost: 24,
    lag: 3,
    effects: { S1: 16 },
  },

  M8: {
    id: "M8",
    name: "Центр семейного здоровья / поликлиника",
    category: "social",
    type: "district",
    cost: 20,
    lag: 3,
    effects: { S2: 14 },
  },

  M9: {
    id: "M9",
    name: "Дворовые спорт-хабы",
    category: "social",
    type: "district",
    cost: 10,
    lag: 1,
    effects: { S1: 3, S2: 3, B1: 3 },
  },

  M10: {
    id: "M10",
    name: "Освещение и камеры",
    category: "safety",
    type: "district",
    cost: 12,
    lag: 1,
    effects: { B1: 12, B2: 2 },
  },

  M11: {
    id: "M11",
    name: "Безопасные переходы и школьные зоны",
    category: "safety",
    type: "district",
    cost: 10,
    lag: 1,
    effects: { B2: 12, T1: -2 },
  },

  M12: {
    id: "M12",
    name: "Единая цифровая платформа обращений",
    category: "services",
    type: "city",
    cost: 14,
    lag: 1,
    effects: { C2: 5 },
  },

  M13: {
    id: "M13",
    name: "Модернизация тепло- и водосетей",
    category: "services",
    type: "district",
    cost: 28,
    lag: 4,
    effects: { C1: 18, E2: 2 },
  },

  M14: {
    id: "M14",
    name: "Аварийные бригады ЖКХ + раннее оповещение",
    category: "services",
    type: "city",
    cost: 16,
    lag: 1,
    effects: { C1: 5, C2: 2 },
  },
};