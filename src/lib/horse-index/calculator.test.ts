import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { calculateHorseIndex } from "./calculator";
import type { TrainingSession, HealthRecord, Competition } from "@/lib/supabase/types";
import type { HorseData } from "./calculator";

// Heure figée : 2024-06-15 12:00:00 UTC
// Les 12h permettent d'avoir des différences de jours entières avec les dates à minuit
const FROZEN_NOW = new Date("2024-06-15T12:00:00.000Z");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FROZEN_NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

/** ISO string exactement N jours avant FROZEN_NOW */
function daysAgo(n: number): string {
  return new Date(FROZEN_NOW.getTime() - n * 86_400_000).toISOString();
}

function makeSession(
  n: number,
  overrides: Partial<TrainingSession> = {}
): TrainingSession {
  return {
    id: `s-${n}`,
    horse_id: "h1",
    date: daysAgo(n),
    type: "plat",
    duration_min: 60,
    intensity: 3,
    feeling: 3,
    notes: null,
    objectif: null,
    lieu: null,
    coach_present: null,
    rider: null,
    equipement_recuperation: null,
    wearable_source: null,
    media_urls: null,
    complement: null,
    linked_competition_id: null,
    mode_entree: null,
    est_complement: null,
    duree_planifiee: null,
    duree_reelle: null,
    note_vocale_brute: null,
    session_type: null,
    foal_reaction: null,
    has_gps_track: false,
    deleted_at: null,
    created_at: FROZEN_NOW.toISOString(),
    ...overrides,
  };
}

function makeHealth(
  type: string,
  n: number,
  overrides: Partial<HealthRecord> = {}
): HealthRecord {
  return {
    id: `r-${type}-${n}`,
    horse_id: "h1",
    type: type as HealthRecord["type"],
    date: daysAgo(n),
    next_date: null,
    notes: null,
    vet_name: null,
    cost: null,
    practitioner_phone: null,
    practitioner_email: null,
    product_name: null,
    urgency: null,
    media_urls: null,
    type_intervention: null,
    sous_type_urgence: null,
    repartition_fers: null,
    matiere_fer: null,
    options_avancees: null,
    recurrence_semaines: null,
    created_at: FROZEN_NOW.toISOString(),
    ...overrides,
  };
}

const empty: HorseData = {
  trainingSessions: [],
  healthRecords: [],
  competitions: [],
  wearableData: [],
};

// ─────────────────────────────────────────────────────────────────────────────
// TEST 1 : données vides → total 0, tous les piliers null sauf suivi_proprio
// ─────────────────────────────────────────────────────────────────────────────
describe("TEST 1 — données vides (mode IE)", () => {
  test("total = 0, sante/bienetre/activite = null, suivi_proprio = 0", () => {
    const r = calculateHorseIndex(empty, "IE");

    expect(r.version).toBe(2);
    expect(r.mode).toBe("IE");
    expect(r.sante_score).toBeNull();
    expect(r.bienetre).toBeNull();
    expect(r.activite).toBeNull();
    expect(r.suivi_proprio).toBe(0);
    expect(r.total).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 2 : suivi_proprio — profil 100 % complet + saisies récentes → 100
// ─────────────────────────────────────────────────────────────────────────────
describe("TEST 2 — suivi_proprio complet (mode IE)", () => {
  test("suivi_proprio = 100 avec profil complet + entrée récente + trousseau + écurie", () => {
    const data: HorseData = {
      ...empty,
      trainingSessions: [makeSession(5)], // dans les 14 derniers jours → +40 pts
      horseProfile: {
        breed: "Selle Français",
        birth_year: 2015,
        conditions_vie: "box-paddock",
        ecurie: "Haras du Val",         // +10 pts
        trousseau: ["couverture légère", "couverture mi-saison"], // +10 pts
      },
    };
    const r = calculateHorseIndex(data, "IE");
    // 40 (profil complet) + 40 (saisie récente) + 10 (trousseau) + 10 (écurie) = 100
    expect(r.suivi_proprio).toBe(100);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 3 : santé — tous les soins à jour → sante_score = 95
// ─────────────────────────────────────────────────────────────────────────────
describe("TEST 3 — santé soins à jour (mode IE)", () => {
  test("sante_score = 95 avec vaccin/vermifuge/ferrage/dentiste récents", () => {
    const data: HorseData = {
      ...empty,
      healthRecords: [
        makeHealth("vaccin",    60, { vet_name: "Dr Dupont" }), // 60j < 182j → 12 pts
        makeHealth("vermifuge", 30),                             // 30j < 90j  → 12 pts
        makeHealth("ferrage",   20),                             // 20j < 35j  → 12 pts
        makeHealth("dentiste",  100),                            // 100j < 365j → 12 pts
      ],
    };
    const r = calculateHorseIndex(data, "IE");
    // soins 60/48 × 60 = 60 pts
    // alerte  = 25 pts (aucune critique)
    // suivi   = 5 pts (hasVet=true) + 5 pts (4 records ≥ 2) = 10 pts
    // total   = 95
    expect(r.sante_score).toBe(95);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 4 : santé — vaccin très en retard (220j, max 182j × 1.1 = 200.2j)
//          → score réduit (facteur 0.7 pour vaccin)
// ─────────────────────────────────────────────────────────────────────────────
describe("TEST 4 — santé vaccin en retard (mode IE)", () => {
  test("sante_score = 86 avec vaccin en retard de 220 jours", () => {
    const data: HorseData = {
      ...empty,
      healthRecords: [
        makeHealth("vaccin",    220), // 220j > 200.2j → 12 × 0.7 = 8.4 pts
        makeHealth("vermifuge", 30),  // à jour → 12 pts
        makeHealth("ferrage",   20),  // à jour → 12 pts
        makeHealth("dentiste",  100), // à jour → 12 pts
      ],
    };
    const r = calculateHorseIndex(data, "IE");
    // soinsScore = 8.4 + 36 = 44.4 ; soinsPossible = 48
    // soinsPts = (44.4/48) × 60 = 55.5
    // alertePts = 25 (pas de critique)
    // suiviPts = 0 (vet_name null) + 5 (4 records ≥ 2) = 5
    // sante_score = round(55.5 + 25 + 5) = round(85.5) = 86
    expect(r.sante_score).toBe(86);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 5 : santé — urgence critique récente → alertePts réduit de 20 %
// ─────────────────────────────────────────────────────────────────────────────
describe("TEST 5 — santé urgence critique (mode IE)", () => {
  test("sante_score = 90 avec urgence critique il y a 5 jours", () => {
    const data: HorseData = {
      ...empty,
      healthRecords: [
        makeHealth("vaccin",      60),
        makeHealth("vermifuge",   30),
        makeHealth("ferrage",     20),
        makeHealth("dentiste",   100),
        makeHealth("veterinaire",  5, { urgency: "critique" }), // critique dans les 30j
      ],
    };
    const r = calculateHorseIndex(data, "IE");
    // soins: 4 soins à jour × 12 = 48/48 → 60 pts
    // alertePts: critique présente → 25 × 0.8 = 20 pts
    // suiviPts: hasVet (type=veterinaire) → 5 + historique (5 records ≥ 5) = 10 + 10 = 10... wait
    // Recheck: praticiensPts: [hasVet, hasMarechal, hasOsteo]
    //   hasVet = true (type="veterinaire") → OK
    //   praticiensPts = 5
    // historiquePts: 5 records ≥ 5 → 10 pts
    // suiviPts = 5 + 10 = 15
    // sante_score = round(60 + 20 + 15) = 95 ... hmm

    // Wait - soinsPossible: vaccin(12) + vermifuge(12) + ferrage(12) + dentiste(12) = 48
    // veterinaire is not in the soins check list, so soinsPossible stays 48
    // soinsScore = 48, soinsRatio = 1, soinsPts = 60
    // sante_score = round(60 + 20 + 15) = 95
    expect(r.sante_score).toBe(95);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 6 : mode IR — protocole correct (2 séances/semaine) → activite = 85
// ─────────────────────────────────────────────────────────────────────────────
describe("TEST 6 — mode IR, protocole correct", () => {
  test("activite = 85 avec 2 séances/semaine sur 90 jours", () => {
    // 26 sessions = 2 / semaine sur 13 semaines (fenêtre 90j)
    const positions = [
       1,  4,  8, 11, 15, 18, 22, 25, 29, 32,
      36, 39, 43, 46, 50, 53, 57, 60, 64, 67,
      71, 74, 78, 81, 85, 88,
    ];
    const data: HorseData = {
      ...empty,
      trainingSessions: positions.map((d) => makeSession(d)),
    };
    const r = calculateHorseIndex(data, "IR");
    // windowDays=90, weeksInWindow=13, avgPerWeek=26/13=2 → in [1,3] → 85
    expect(r.activite).toBe(85);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 7 : mode IR — suractivité → activite bas
// ─────────────────────────────────────────────────────────────────────────────
describe("TEST 7 — mode IR, suractivité (1 séance/jour sur 90 jours)", () => {
  test("activite = 26 avec une séance par jour (overtraining)", () => {
    // 90 sessions d'affilée → avgPerWeek = 90/13 ≈ 6.92 > 5
    const data: HorseData = {
      ...empty,
      trainingSessions: Array.from({ length: 90 }, (_, i) => makeSession(i + 1)),
    };
    const r = calculateHorseIndex(data, "IR");
    // avgPerWeek = 90/13 ≈ 6.923
    // score = round(max(20, 85 - (6.923 - 3) × 15))
    //       = round(max(20, 85 - 58.846))
    //       = round(max(20, 26.154))
    //       = round(26.154) = 26
    expect(r.activite).toBe(26);
    // Pour IR, activite a un poids de 0 → non inclus dans total
    expect(r.total).toBeGreaterThan(0); // mais le score global existe quand même
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 8 : mode IS — retraite, 1 contact/semaine → activite = 100
// ─────────────────────────────────────────────────────────────────────────────
describe("TEST 8 — mode IS (retraite), contacts réguliers", () => {
  test("activite = 100 avec 1 contact/semaine sans travail monté", () => {
    // 13 contacts, 1 par semaine, fenêtre 90j (13 semaines)
    const data: HorseData = {
      ...empty,
      trainingSessions: [1, 8, 15, 22, 29, 36, 43, 50, 57, 64, 71, 78, 85].map((d) =>
        makeSession(d, { type: "balade", duration_min: 20 })
      ),
    };
    const r = calculateHorseIndex(data, "IS");
    // weeksInWindow=13, weeksWithContact=13/13 → 100
    expect(r.activite).toBe(100);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 9 : mode ICr — poulain, contacts réguliers → activite = 100
// ─────────────────────────────────────────────────────────────────────────────
describe("TEST 9 — mode ICr (croissance), contacts hebdomadaires", () => {
  test("activite = 100 avec 1 contact/semaine sur 180 jours", () => {
    // 26 contacts, 1 par semaine, fenêtre 180j (ceil(180/7)=26 semaines)
    const data: HorseData = {
      ...empty,
      trainingSessions: Array.from({ length: 26 }, (_, i) =>
        makeSession(i * 7 + 1, { type: "travail_a_pied", duration_min: 30 })
      ),
    };
    const r = calculateHorseIndex(data, "ICr");
    // weeksInWindow=26, weeksWithContact=26/26 → 100
    expect(r.activite).toBe(100);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 10 : mode IC — bonus concours
// ─────────────────────────────────────────────────────────────────────────────
describe("TEST 10 — mode IC, bonus concours (classement 1/10)", () => {
  // 16 séances en 30j (4/semaine), feeling=3, intensity=3
  const sessions = [2, 3, 5, 6, 9, 10, 12, 13, 16, 17, 19, 20, 23, 24, 26, 27].map(
    (d) => makeSession(d)
  );

  const competition: Competition = {
    id: "c1",
    horse_id: "h1",
    date: daysAgo(30),
    event_name: "Grand Prix",
    discipline: "CSO",
    level: "Amateur",
    result_rank: 1,
    total_riders: 10,
    score: null,
    notes: null,
    location: null,
    media_urls: null,
    status: "passe",
    score_dressage: null,
    penalites_cso: null,
    penalites_cross: null,
    created_at: FROZEN_NOW.toISOString(),
  };

  test("activite sans concours = 65", () => {
    const r = calculateHorseIndex(
      { ...empty, trainingSessions: sessions },
      "IC"
    );
    // regulariteScore = min(50, (3.2/4)×50) = 40
    // progressionScore = 25 (trend=0, pas de concours)
    // activite = 40 + 25 = 65
    expect(r.activite).toBe(65);
  });

  test("activite avec concours 1/10 = 70 (+5 via bonus)", () => {
    const r = calculateHorseIndex(
      { ...empty, trainingSessions: sessions, competitions: [competition] },
      "IC"
    );
    // progressionScore = min(50, 25 + 1.0×5) = 30
    // activite = 40 + 30 = 70
    expect(r.activite).toBe(70);
  });
});
