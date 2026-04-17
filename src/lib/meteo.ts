// ─── Types ───────────────────────────────────────────────────────────────────

export interface HorseMeteoProfile {
  id: string;
  name: string;
  conditions_vie: "box" | "paddock" | "pre" | "box_paddock" | null;
  tonte: "non_tondu" | "partielle" | "complete" | null;
  morphologie_meteo: "sang_chaud" | "pur_sang" | "rustique" | null;
  etat_corporel: "normal" | "maigre" | null;
  birth_year: number | null;
  trousseau: Couverture[];
}

export interface Couverture {
  label: string;
  grammage: number;
  impermeable: boolean;
}

export interface HourlyWeather {
  time: string;       // ISO string
  temp: number;       // °C
  feelsLike: number;  // °C ressenti
  rainProb: number;   // %
  rain: number;       // mm
  wind: number;       // km/h
  humidity: number;   // %
  weathercode: number;
  pressure: number;   // hPa (pressure_msl)
  visibility: number; // mètres
}

// METEO-REV01 — Alerte contextuelle
export interface WeatherAlert {
  id: string;
  message: string;
  severity: "warning" | "danger";
}

export interface NightMetrics {
  tmin: number;
  feelsLikeMin: number;
  rainExpected: boolean;
  windMax: number;
  frostRisk: boolean;
}

export interface DayMetrics {
  tmax: number;
  amplitude: number;
}

export interface WorkSlot {
  hour: number;    // start hour
  label: string;   // "10h–12h"
  rating: "ideal" | "acceptable" | "bad";
  reasons: string[];
}

export interface BlanketReco {
  grammage: number;
  impermeable: boolean;
  undersheet: boolean;
  label: string;          // "300g imperméable + sous-couverture"
  ideal_grammage: number; // grammage idéal avant filtrage trousseau
  trousseau_match: string | null; // nom de la couverture du trousseau si trouvée
  note: string | null;    // "(idéal 200g — vous avez 300g)"
}

// ─── Moteur de recommandation couverture (METEO-03) ──────────────────────────

// Matrice : [row = tranche temp][col = profil]
// col 0 = Non tondu Box | col 1 = Non tondu Pré | col 2 = Tondu complet Box | col 3 = Tondu complet Pré
// Valeur = grammage de base (0 = sans couverture)
const BASE_MATRIX: number[][] = [
  // >10°C
  [0,   0,   75,  0],
  // 5–10°C
  [50,  100, 200, 200],
  // 0–5°C
  [100, 150, 300, 300],
  // -5–0°C
  [150, 200, 300, 300],
  // <-5°C
  [200, 300, 400, 400],
];

// Quelle colonne selon tonte × logement
function getBaseCol(
  tonte: HorseMeteoProfile["tonte"],
  isOutsideNight: boolean,
): number {
  const outside = isOutsideNight ? 1 : 0;
  if (!tonte || tonte === "non_tondu") return outside;        // 0 or 1
  if (tonte === "complete")           return outside + 2;     // 2 or 3
  return outside; // partielle → starts like non_tondu, then shifted +1 row
}

function getTempRow(feelsLike: number): number {
  if (feelsLike > 10) return 0;
  if (feelsLike > 5)  return 1;
  if (feelsLike > 0)  return 2;
  if (feelsLike > -5) return 3;
  return 4;
}

// Whether the horse is outside at night
function isOutsideAtNight(conditions_vie: HorseMeteoProfile["conditions_vie"]): boolean {
  return conditions_vie === "pre" || conditions_vie === "paddock";
}

export function computeBlanketReco(
  horse: HorseMeteoProfile,
  night: NightMetrics,
): BlanketReco {
  const outside = isOutsideAtNight(horse.conditions_vie);
  const col = getBaseCol(horse.tonte, outside);
  let row = getTempRow(night.feelsLikeMin);

  // Modificateurs → décaler row
  if (horse.tonte === "partielle") row = Math.min(row + 1, 4);
  if (horse.morphologie_meteo === "pur_sang") row = Math.min(row + 1, 4);
  if (horse.morphologie_meteo === "rustique") row = Math.max(row - 1, 0);
  if (horse.etat_corporel === "maigre") row = Math.min(row + 1, 4);
  if (horse.birth_year) {
    const age = new Date().getFullYear() - horse.birth_year;
    if (age > 18) row = Math.min(row + 1, 4);
  }
  if (night.windMax > 30) row = Math.min(row + 1, 4);

  const idealGrammage = BASE_MATRIX[row][col];
  const needsUndersheet = row >= 3 && (col === 2 || col === 3); // 300g+ tondu
  const needsWaterproof = outside || night.rainExpected;

  // Filtrage trousseau
  let trousseauMatch: string | null = null;
  let finalGrammage = idealGrammage;
  let note: string | null = null;

  if (horse.trousseau && horse.trousseau.length > 0) {
    const candidates = horse.trousseau
      .filter((c) => needsWaterproof ? c.impermeable : true)
      .sort((a, b) => a.grammage - b.grammage);

    const exact = candidates.find((c) => c.grammage === idealGrammage);
    if (exact) {
      trousseauMatch = exact.label;
      finalGrammage = exact.grammage;
    } else {
      const above = candidates.find((c) => c.grammage > idealGrammage);
      if (above) {
        trousseauMatch = above.label;
        finalGrammage = above.grammage;
        note = `idéal ${idealGrammage}g — vous avez ${above.grammage}g`;
      } else {
        // Closest available even if lower
        const best = [...candidates].reverse().find((c) => c.grammage <= idealGrammage);
        if (best) {
          trousseauMatch = best.label;
          finalGrammage = best.grammage;
          note = `idéal ${idealGrammage}g — vous avez ${best.grammage}g`;
        }
      }
    }
  }

  // Build label
  const parts: string[] = [];
  if (finalGrammage === 0) {
    parts.push(needsWaterproof ? "Imperméable légère" : "Sans couverture");
  } else {
    parts.push(`${finalGrammage}g${needsWaterproof ? " imperméable" : ""}`);
  }
  if (needsUndersheet) parts.push("+ sous-couverture");

  return {
    grammage: finalGrammage,
    impermeable: needsWaterproof,
    undersheet: needsUndersheet,
    label: parts.join(" "),
    ideal_grammage: idealGrammage,
    trousseau_match: trousseauMatch,
    note,
  };
}

// ─── Calcul des fenêtres de travail (METEO-04) ───────────────────────────────

export function computeWorkSlots(hourly: HourlyWeather[], date: string): WorkSlot[] {
  const dayHours = hourly.filter((h) => h.time.startsWith(date));
  const slots: WorkSlot[] = [];

  // 2h slots from 6h to 20h
  for (let startH = 6; startH <= 18; startH += 2) {
    const block = dayHours.filter((h) => {
      const hour = new Date(h.time).getHours();
      return hour >= startH && hour < startH + 2;
    });
    if (!block.length) continue;

    const avgTemp = block.reduce((s, h) => s + h.temp, 0) / block.length;
    const avgWind = block.reduce((s, h) => s + h.wind, 0) / block.length;
    const maxRain = Math.max(...block.map((h) => h.rainProb));
    const hasStorm = block.some((h) => h.weathercode >= 95);

    const reasons: string[] = [];
    let rating: WorkSlot["rating"];

    if (
      hasStorm ||
      avgTemp < 3 ||
      avgTemp > 30 ||
      avgWind > 50 ||
      maxRain > 50
    ) {
      rating = "bad";
      if (hasStorm) reasons.push("Orage");
      if (avgTemp < 3) reasons.push(`${Math.round(avgTemp)}°C — trop froid`);
      if (avgTemp > 30) reasons.push(`${Math.round(avgTemp)}°C — canicule`);
      if (avgWind > 50) reasons.push(`Vent ${Math.round(avgWind)} km/h`);
      if (maxRain > 50) reasons.push(`Pluie ${Math.round(maxRain)}%`);
    } else if (
      (avgTemp >= 3 && avgTemp < 8) ||
      (avgTemp > 25 && avgTemp <= 30) ||
      (avgWind >= 30 && avgWind <= 50) ||
      (maxRain >= 20 && maxRain <= 50)
    ) {
      rating = "acceptable";
      if (avgTemp < 8) reasons.push(`${Math.round(avgTemp)}°C — froid`);
      if (avgTemp > 25) reasons.push(`${Math.round(avgTemp)}°C — chaud`);
      if (avgWind >= 30) reasons.push(`Vent ${Math.round(avgWind)} km/h`);
      if (maxRain >= 20) reasons.push(`Pluie ${Math.round(maxRain)}%`);
    } else {
      rating = "ideal";
      reasons.push(`${Math.round(avgTemp)}°C, sec`);
    }

    slots.push({
      hour: startH,
      label: `${startH}h–${startH + 2}h`,
      rating,
      reasons,
    });
  }

  return slots;
}

// ─── Métriques nuit (22h → 7h) ───────────────────────────────────────────────

export function computeNightMetrics(hourly: HourlyWeather[], date: string): NightMetrics {
  // Tonight = from today 20h to tomorrow 8h
  const tomorrow = new Date(date);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const nightHours = hourly.filter((h) => {
    const hour = new Date(h.time).getHours();
    const hDate = h.time.split("T")[0];
    return (hDate === date && hour >= 20) || (hDate === tomorrowStr && hour <= 8);
  });

  if (!nightHours.length) {
    return { tmin: 10, feelsLikeMin: 10, rainExpected: false, windMax: 0, frostRisk: false };
  }

  const tmin = Math.min(...nightHours.map((h) => h.temp));
  const feelsLikeMin = Math.min(...nightHours.map((h) => h.feelsLike));
  const windMax = Math.max(...nightHours.map((h) => h.wind));
  const rainExpected = nightHours.some((h) => h.rainProb > 40 || h.rain > 0.5);
  const frostRisk = nightHours.some((h) => {
    const hour = new Date(h.time).getHours();
    return h.temp < 0 && hour >= 2 && hour <= 8;
  });

  return { tmin, feelsLikeMin, windMax, rainExpected, frostRisk };
}

export function computeDayMetrics(hourly: HourlyWeather[], date: string): DayMetrics {
  const dayHours = hourly.filter((h) => h.time.startsWith(date));
  if (!dayHours.length) return { tmax: 15, amplitude: 0 };
  const tmax = Math.max(...dayHours.map((h) => h.temp));
  const tmin = Math.min(...dayHours.map((h) => h.temp));
  return { tmax, amplitude: tmax - tmin };
}

// ─── METEO-REV01 — Système d'alertes A-01 à A-08 ────────────────────────────

export function computeAlerts(
  hourly: HourlyWeather[],
  date: string,
  night: NightMetrics,
  day: DayMetrics,
): WeatherAlert[] {
  const alerts: WeatherAlert[] = [];
  const todayHours = hourly.filter((h) => h.time.startsWith(date));
  const now = new Date();
  const nowHour = now.getHours();

  // A-01 Amplitude forte
  if (day.amplitude > 10) {
    alerts.push({
      id: "A-01",
      message: `Amplitude forte — écart de ${Math.round(day.amplitude)}°C entre nuit et journée`,
      severity: "warning",
    });
  }

  // A-02 Pluie imminente (dans les 12 prochaines heures)
  const next12h = hourly.filter((h) => {
    const hTime = new Date(h.time);
    return hTime >= now && hTime <= new Date(now.getTime() + 12 * 3600000);
  });
  const firstRain = next12h.find((h) => h.rainProb > 50);
  if (firstRain) {
    alerts.push({
      id: "A-02",
      message: `Pluie à partir de ${new Date(firstRain.time).getHours()}h`,
      severity: "warning",
    });
  }

  // A-03 Vent fort
  const maxWind = todayHours.length > 0 ? Math.max(...todayHours.map((h) => h.wind)) : 0;
  if (maxWind > 35) {
    alerts.push({
      id: "A-03",
      message: `Vent fort — ${Math.round(maxWind)} km/h`,
      severity: "warning",
    });
  }

  // A-04 Gel sol matin
  if (night.frostRisk) {
    alerts.push({
      id: "A-04",
      message: "Gel possible cette nuit — sol difficile le matin",
      severity: "danger",
    });
  }

  // A-05 Brouillard dense (visibilité < 200m dans les 12h)
  const fogHour = next12h.find((h) => h.visibility > 0 && h.visibility < 200);
  if (fogHour) {
    alerts.push({
      id: "A-05",
      message: "Brouillard dense prévu ce matin",
      severity: "warning",
    });
  }

  // A-06 Canicule (T° ressentie > 35°C)
  const maxFeelsLike = todayHours.length > 0 ? Math.max(...todayHours.map((h) => h.feelsLike)) : 0;
  if (maxFeelsLike > 35) {
    alerts.push({
      id: "A-06",
      message: "Canicule — travail déconseillé aux heures chaudes",
      severity: "danger",
    });
  }

  // A-07 Première gelée de la saison — implémenté via localStorage (v1)
  if (night.frostRisk && typeof window !== "undefined") {
    const currentYear = now.getFullYear();
    const augustFirst = new Date(currentYear, 7, 1); // 1er août
    const storedDate = localStorage.getItem("equistra_first_frost_date");
    const storedParsed = storedDate ? new Date(storedDate) : null;

    if (!storedParsed || storedParsed < augustFirst) {
      alerts.push({
        id: "A-07",
        message: "Première gelée de la saison cette nuit",
        severity: "danger",
      });
      localStorage.setItem("equistra_first_frost_date", now.toISOString().split("T")[0]);
    }
  }

  // A-08 Changement météo rapide (chute pression > 8 hPa en 3h)
  if (todayHours.length >= 4) {
    for (let i = 3; i < todayHours.length; i++) {
      const pressNow = todayHours[i].pressure;
      const press3hAgo = todayHours[i - 3].pressure;
      if (pressNow > 0 && press3hAgo > 0 && press3hAgo - pressNow > 8) {
        alerts.push({
          id: "A-08",
          message: "Changement météo rapide prévu — risque de turbulences atmosphériques",
          severity: "warning",
        });
        break;
      }
    }
  }

  return alerts;
}

// ─── METEO-REV01 — Preview J+1 (phrase générée front-side) ──────────────────

function getWeatherLabelForPreview(code: number): string {
  if (code === 0) return "Ciel dégagé";
  if (code <= 3) return "Nuageux";
  if (code <= 48) return "Brouillard";
  if (code <= 65) return "Pluie";
  if (code <= 77) return "Neige";
  if (code <= 82) return "Averses";
  return "Variable";
}

export function getJ1Preview(hourly: HourlyWeather[], tomorrowDate: string): string {
  const tomorrow = hourly.filter((h) => h.time.startsWith(tomorrowDate));
  if (!tomorrow.length) return "";

  const maxFeelsLike = Math.max(...tomorrow.map((h) => h.feelsLike));
  const frostRisk = tomorrow.some((h) => {
    const hh = new Date(h.time).getHours();
    return h.temp < 0 && hh >= 2 && hh <= 9;
  });
  const rainHour = tomorrow.find((h) => h.rainProb > 50);
  const maxWind = Math.max(...tomorrow.map((h) => h.wind));
  const tmin = Math.min(...tomorrow.map((h) => h.temp));
  const tmax = Math.max(...tomorrow.map((h) => h.temp));
  const midCode = tomorrow[Math.floor(tomorrow.length / 2)]?.weathercode ?? 0;

  if (maxFeelsLike > 35) return "Demain : canicule prévue";
  if (frostRisk) return "Demain : gel possible le matin";
  if (rainHour) return `Demain : pluie à partir de ${new Date(rainHour.time).getHours()}h`;
  if (maxWind > 35) return "Demain : vent fort";
  return `Demain : ${getWeatherLabelForPreview(midCode)} — min ${Math.round(tmin)}° / max ${Math.round(tmax)}°`;
}

// ─── Geocoding écurie → lat/lon (Nominatim OSM, gratuit) ─────────────────────

export async function geocodeEcurie(ecurie: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(ecurie + ", France")}&format=json&limit=1`,
      { headers: { "User-Agent": "Equistra/1.0" }, signal: AbortSignal.timeout(5000) }
    );
    const data = await res.json();
    if (data[0]) return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  } catch {}
  return null;
}
