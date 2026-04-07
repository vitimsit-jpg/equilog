"use client";

import { useEffect, useState } from "react";
import { Sun, Cloud, CloudRain, CloudSnow, Zap, Wind, Droplets, Moon, ChevronDown, ChevronUp, AlertTriangle, Snowflake, CloudSun } from "lucide-react";
import {
  type HorseMeteoProfile,
  type HourlyWeather,
  type BlanketReco,
  computeNightMetrics,
  computeDayMetrics,
  computeWorkSlots,
  computeBlanketReco,
  geocodeEcurie,
} from "@/lib/meteo";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  horses: HorseMeteoProfile[];
  ecurie?: string | null;
}

interface WeatherState {
  hourly: HourlyWeather[];
  city: string;
  lat: number;
  lon: number;
  loadedAt: Date;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getWeatherIcon(code: number, size = "h-5 w-5") {
  if (code === 0 || code === 1) return <Sun className={`${size} text-yellow-400`} />;
  if (code === 2)               return <CloudSun className={`${size} text-yellow-300`} />;
  if (code <= 3)                return <Cloud className={`${size} text-gray-400`} />;
  if (code <= 48)               return <Cloud className={`${size} text-gray-300`} />;
  if (code <= 67)               return <CloudRain className={`${size} text-blue-400`} />;
  if (code <= 77)               return <CloudSnow className={`${size} text-blue-200`} />;
  if (code <= 82)               return <CloudRain className={`${size} text-blue-500`} />;
  return                               <Zap className={`${size} text-yellow-600`} />;
}

function getWeatherLabel(code: number): string {
  if (code === 0)           return "Ciel dégagé";
  if (code <= 3)            return "Nuageux";
  if (code <= 48)           return "Brouillard";
  if (code <= 55)           return "Bruine";
  if (code <= 65)           return "Pluie";
  if (code <= 67)           return "Pluie verglaçante";
  if (code <= 77)           return "Neige";
  if (code <= 82)           return "Averses";
  if (code <= 99)           return "Orage";
  return "Variable";
}

function getBlanketSemanticLabel(reco: BlanketReco): string {
  // If the horse has a specific blanket matched → use its name
  if (reco.trousseau_match) return reco.trousseau_match;
  if (reco.grammage === 0) return "Sans couverture";
  if (reco.grammage <= 100) return "Légère";
  if (reco.grammage <= 200) return "Moyenne";
  return "Chaude";
}

function getBlanketColor(reco: BlanketReco): string {
  if (reco.grammage === 0) return "text-gray-500";
  if (reco.grammage <= 100) return "text-green-600";
  if (reco.grammage <= 200) return "text-orange";
  return "text-blue-600";
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function WeatherWidget({ horses, ecurie }: Props) {
  const [state, setState] = useState<WeatherState | null>(null);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const hour = mounted ? new Date().getHours() : 0;
  const mode: "matin" | "soir" | "nuit" =
    hour >= 6 && hour < 15 ? "matin" :
    hour >= 15 && hour < 21 ? "soir" : "nuit";

  useEffect(() => {
    async function load() {
      try {
        let lat = 48.8566;
        let lon = 2.3522;
        let city = "Paris";

        // 1. Essayer géocodage écurie
        if (ecurie) {
          const geo = await geocodeEcurie(ecurie);
          if (geo) { lat = geo.lat; lon = geo.lon; city = ecurie; }
        }

        // 2. Fallback IP
        if (city === "Paris") {
          try {
            const ip = await fetch("https://ip-api.com/json/?fields=lat,lon,city", { signal: AbortSignal.timeout(4000) });
            if (ip.ok) {
              const d = await ip.json();
              if (d.lat && d.lon) { lat = d.lat; lon = d.lon; city = d.city || city; }
            }
          } catch {}
        }

        // 3. Open-Meteo hourly 3j (gratuit, pas de clé)
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
          `&hourly=temperature_2m,apparent_temperature,precipitation_probability,precipitation,windspeed_10m,weathercode,relativehumidity_2m` +
          `&forecast_days=3&timezone=auto`;

        const res = await fetch(url);
        const d = await res.json();

        const hourly: HourlyWeather[] = d.hourly.time.map((t: string, i: number) => ({
          time: t,
          temp: d.hourly.temperature_2m[i],
          feelsLike: d.hourly.apparent_temperature[i],
          rainProb: d.hourly.precipitation_probability[i],
          rain: d.hourly.precipitation[i],
          wind: d.hourly.windspeed_10m[i],
          humidity: d.hourly.relativehumidity_2m[i],
          weathercode: d.hourly.weathercode[i],
        }));

        setState({ hourly, city, lat, lon, loadedAt: new Date() });
      } catch {
        setError(true);
      }
    }
    load();
  }, [ecurie]);

  if (error) return (
    <div className="card border border-gray-100 text-sm text-gray-400">Météo non disponible</div>
  );

  if (!state) return (
    <div className="card border border-gray-100 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gray-100 flex-shrink-0" />
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-gray-100 rounded w-1/3" />
          <div className="h-3 bg-gray-100 rounded w-1/2" />
        </div>
      </div>
    </div>
  );

  const today = new Date().toISOString().split("T")[0];
  const nowHour = state.hourly.find((h) => new Date(h.time).getHours() === hour && h.time.startsWith(today));
  const currentCode = nowHour?.weathercode ?? 0;
  const currentTemp = nowHour?.temp ?? state.hourly[0]?.temp ?? 0;
  const currentWind = nowHour?.wind ?? 0;

  const night = computeNightMetrics(state.hourly, today);
  const day = computeDayMetrics(state.hourly, today);
  const slots = computeWorkSlots(state.hourly, today);

  const hasHorsesWithProfile = horses.some((h) => h.tonte || h.conditions_vie);
  const recos: { horse: HorseMeteoProfile; reco: BlanketReco }[] = horses
    .filter((h) => h.tonte || h.conditions_vie)
    .map((h) => ({ horse: h, reco: computeBlanketReco(h, night) }));

  const amplitudeAlert = day.amplitude > 10;
  const frostAlert = night.frostRisk;

  // Créneaux météo (2h) pour section étendue
  const meteoSlots = [6, 8, 10, 12, 14, 16, 18, 20].map((startH) => {
    const block = state.hourly.filter((h) => {
      const hh = new Date(h.time).getHours();
      return h.time.startsWith(today) && hh >= startH && hh < startH + 2;
    });
    if (!block.length) return null;
    const avgRainProb = Math.round(block.reduce((s, h) => s + h.rainProb, 0) / block.length);
    const totalRain = parseFloat(block.reduce((s, h) => s + h.rain, 0).toFixed(1));
    const dominantCode = block[Math.floor(block.length / 2)]?.weathercode ?? block[0].weathercode;
    const isNow = hour >= startH && hour < startH + 2;
    return { startH, avgRainProb, totalRain, dominantCode, isNow };
  }).filter(Boolean);

  return (
    <div className="card border overflow-hidden" style={{ borderColor: mode === "matin" ? "#e5f3ff" : "#1a1a1a20" }}>

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div
        className="flex items-start justify-between gap-4 cursor-pointer"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center flex-shrink-0">
            {getWeatherIcon(currentCode)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xl font-black text-black">{Math.round(currentTemp)}°C</span>
              <span className="text-sm text-gray-500">{getWeatherLabel(currentCode)}</span>
              <span className="text-xs text-gray-400">— {state.city}</span>
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Wind className="h-3 w-3" />{Math.round(currentWind)} km/h
              </span>
              {frostAlert && (
                <span className="text-xs font-semibold text-blue-500 flex items-center gap-1">
                  <Snowflake className="h-3 w-3" />Gel
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
            {mode === "matin" ? "🏇 Travail" : mode === "soir" ? "🌙 Couverture" : "🌙 Nuit"}
          </span>
          {expanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </div>
      </div>

      {/* ── Résumé inline (collapsed) ────────────────────────────────── */}
      {!expanded && (
        <div className="mt-3 pt-3 border-t border-gray-50">
          {/* Amplitude de température */}
          <p className="text-xs text-gray-600 flex items-center gap-2">
            <span className="font-semibold text-black">
              {Math.round(day.tmax - day.amplitude)}° – {Math.round(day.tmax)}°
            </span>
            <span className="text-gray-400">
              Amplitude {Math.round(day.amplitude)}°C
            </span>
            {amplitudeAlert && (
              <span className="text-xs font-semibold text-orange">⚠ Forte</span>
            )}
          </p>

          {/* Couverture soir/nuit */}
          {(mode === "soir" || mode === "nuit") && recos.length > 0 && (
            <div className="space-y-1 mt-2">
              {recos.slice(0, 2).map(({ horse, reco }) => (
                <p key={horse.id} className="text-xs text-gray-600">
                  <span className="font-semibold text-black">{horse.name}</span>
                  {" → "}
                  <span className={`font-semibold ${getBlanketColor(reco)}`}>
                    {getBlanketSemanticLabel(reco)}
                  </span>
                  {reco.note && <span className="text-gray-400"> ({reco.note})</span>}
                </p>
              ))}
              {recos.length > 2 && (
                <p className="text-xs text-gray-400">{recos.length - 2} autre{recos.length - 2 > 1 ? "s" : ""} cheval{recos.length - 2 > 1 ? "aux" : ""} →</p>
              )}
            </div>
          )}
          {(mode === "soir" || mode === "nuit") && !hasHorsesWithProfile && (
            <p className="text-xs text-gray-400 mt-2">
              Complétez le profil météo de vos chevaux pour obtenir une recommandation de couverture.
            </p>
          )}
        </div>
      )}

      {/* ── Détail étendu ────────────────────────────────────────────── */}
      {expanded && (
        <div className="mt-4 space-y-4">

          {/* Alertes */}
          {(amplitudeAlert || frostAlert) && (
            <div className="space-y-2">
              {amplitudeAlert && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-orange-light">
                  <AlertTriangle className="h-4 w-4 text-orange flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-gray-700">
                    <span className="font-semibold text-orange">Amplitude forte ({Math.round(day.amplitude)}°C)</span>
                    {" "}— Penser à alléger la couverture dans la journée.
                  </p>
                </div>
              )}
              {frostAlert && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50">
                  <Snowflake className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-gray-700">
                    <span className="font-semibold text-blue-600">Gel probable cette nuit</span>
                    {" "}— Vérifier le sol avant la séance du matin. Éviter galop et obstacles.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Créneaux météo — remplace Fenêtres de travail */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Prévisions par créneau</p>
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
              {meteoSlots.map((slot) => {
                if (!slot) return null;
                const { startH, avgRainProb, totalRain, dominantCode, isNow } = slot;
                return (
                  <div
                    key={startH}
                    className={`flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl min-w-[58px] ${isNow ? "bg-black" : "bg-gray-50"}`}
                  >
                    <span className={`text-2xs font-semibold ${isNow ? "text-gray-400" : "text-gray-400"}`}>
                      {startH}h–{startH + 2}h
                    </span>
                    {getWeatherIcon(dominantCode, "h-4 w-4")}
                    <span className={`text-xs font-bold flex items-center gap-0.5 ${isNow ? "text-white" : avgRainProb >= 50 ? "text-blue-500" : "text-gray-500"}`}>
                      <Droplets className="h-2.5 w-2.5" />{avgRainProb}%
                    </span>
                    {totalRain > 0.1 && (
                      <span className={`text-2xs font-medium ${isNow ? "text-blue-300" : "text-blue-400"}`}>
                        {totalRain}mm
                      </span>
                    )}
                  </div>
                );
              })}
              {meteoSlots.length === 0 && (
                <p className="text-xs text-gray-400">Données non disponibles</p>
              )}
            </div>
          </div>

          {/* Recommandations couverture */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
              Couverture ce soir (min nuit {Math.round(night.tmin)}°C
              {night.rainExpected ? ", pluie prévue" : ""})
            </p>
            {recos.length > 0 ? (
              <div className="space-y-2">
                {recos.map(({ horse, reco }) => (
                  <div key={horse.id} className="flex items-center justify-between gap-3 py-2 border-b border-gray-50 last:border-0">
                    <span className="text-sm font-semibold text-black">{horse.name}</span>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${getBlanketColor(reco)}`}>
                        {getBlanketSemanticLabel(reco)}
                      </p>
                      {reco.note && (
                        <p className="text-xs text-gray-400">({reco.note})</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 rounded-xl border-2 border-dashed border-gray-200 text-center">
                <p className="text-xs text-gray-400">
                  Renseignez <span className="font-semibold">Logement</span> et <span className="font-semibold">Tonte</span> dans la fiche cheval pour obtenir la recommandation personnalisée.
                </p>
              </div>
            )}
          </div>

          {/* Météo horaire aujourd'hui */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Aujourd&apos;hui heure par heure</p>
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
              {state.hourly
                .filter((h) => h.time.startsWith(today))
                .filter((_, i) => i % 2 === 0)
                .map((h) => {
                  const hh = new Date(h.time).getHours();
                  const isNow = hh === hour;
                  return (
                    <div
                      key={h.time}
                      className={`flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-xl min-w-[52px] ${isNow ? "bg-black text-white" : "bg-gray-50"}`}
                    >
                      <span className={`text-xs font-semibold ${isNow ? "text-white" : "text-gray-400"}`}>{hh}h</span>
                      {getWeatherIcon(h.weathercode, "h-4 w-4")}
                      <span className={`text-xs font-bold ${isNow ? "text-white" : "text-black"}`}>{Math.round(h.temp)}°</span>
                      {h.rainProb > 20 && (
                        <span className={`text-2xs font-medium flex items-center gap-0.5 ${isNow ? "text-blue-300" : "text-blue-400"}`}>
                          <Droplets className="h-2.5 w-2.5" />{Math.round(h.rainProb)}%
                        </span>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>

          <p className="text-2xs text-gray-300 text-right">
            Mis à jour à {state.loadedAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
      )}
    </div>
  );
}
