"use client";

import { useEffect, useState } from "react";
import { Sun, Cloud, CloudRain, CloudSnow, Zap, Wind, Droplets, Moon, ChevronDown, ChevronUp, AlertTriangle, Snowflake, CloudSun } from "lucide-react";
import {
  type HorseMeteoProfile,
  type HourlyWeather,
  computeNightMetrics,
  computeDayMetrics,
  computeAlerts,
  getJ1Preview,
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
  sunsets: string[];
  sunrises: string[];
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

        // 3. Open-Meteo hourly 3j + daily sunset/sunrise (METEO-REV01)
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
          `&hourly=temperature_2m,apparent_temperature,precipitation_probability,precipitation,windspeed_10m,weathercode,relativehumidity_2m,pressure_msl,visibility` +
          `&daily=sunset,sunrise` +
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
          pressure: d.hourly.pressure_msl?.[i] ?? 0,
          visibility: d.hourly.visibility?.[i] ?? 10000,
        }));

        const sunsets: string[] = d.daily?.sunset ?? [];
        const sunrises: string[] = d.daily?.sunrise ?? [];

        setState({ hourly, city, lat, lon, loadedAt: new Date(), sunsets, sunrises });
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

  // METEO-REV01 — Alertes contextuelles + preview J+1
  const alerts = computeAlerts(state.hourly, today, night, day);
  const frostAlert = night.frostRisk;

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];
  const j1Preview = getJ1Preview(state.hourly, tomorrowStr);

  // Heure de coucher du soleil (aujourd'hui)
  const sunsetRaw = state.sunsets?.[0];
  const sunsetTime = sunsetRaw ? `${new Date(sunsetRaw).getHours()}h${String(new Date(sunsetRaw).getMinutes()).padStart(2, "0")}` : null;

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
            {mode === "matin" ? "🏇 Travail" : "🌙 Nuit"}
          </span>
          {expanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </div>
      </div>

      {/* ── Résumé inline (collapsed) — METEO-REV01 ──────────────────── */}
      {!expanded && (
        <div className="mt-3 pt-3 border-t border-gray-50 space-y-2">
          {/* Ligne 1 : Amplitude + Min nuit + Coucher soleil */}
          <div className="flex items-center gap-3 text-xs text-gray-600 flex-wrap">
            <span className="font-semibold text-black">
              {Math.round(day.tmax - day.amplitude)}° – {Math.round(day.tmax)}°
            </span>
            <span className="text-gray-400">Nuit : {Math.round(night.tmin)}°</span>
            {sunsetTime && (
              <span className="text-gray-400">☀️ Coucher : {sunsetTime}</span>
            )}
          </div>

          {/* Alertes contextuelles (A-01 à A-08) */}
          {alerts.length > 0 ? (
            <div className="space-y-1">
              {alerts.map((alert) => (
                <div key={alert.id} className={`flex items-start gap-1.5 px-2 py-1.5 rounded-lg text-xs ${
                  alert.severity === "danger" ? "bg-red-50 text-red-700" : "bg-orange-light text-gray-700"
                }`}>
                  <AlertTriangle className="h-3 w-3 flex-shrink-0 mt-0.5" />
                  <span>{alert.message}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-green-600 flex items-center gap-1">✅ Conditions normales</p>
          )}

          {/* Preview J+1 */}
          {j1Preview && (
            <p className="text-2xs text-gray-400 pt-1 border-t border-gray-50">{j1Preview}</p>
          )}

        </div>
      )}

      {/* ── Vue détail étendue — METEO-REV02 ──────────────────────────── */}
      {expanded && (
        <WeatherDetailInline
          hourly={state.hourly}
          sunsets={state.sunsets}
          city={state.city}
          hour={hour}
          mode={mode}
          loadedAt={state.loadedAt}
        />
      )}
    </div>
  );
}

// ── Vue détail inline (METEO-REV02) — toggle J/J+1/J+2 + vue horaire unifiée ──

const DAY_LABELS_METEO = ["Aujourd'hui", "Demain", "J+2"];

function WeatherDetailInline({
  hourly,
  sunsets,
  city,
  hour,
  mode,
  loadedAt,
}: {
  hourly: HourlyWeather[];
  sunsets: string[];
  city: string;
  hour: number;
  mode: "matin" | "soir" | "nuit";
  loadedAt: Date;
}) {
  const [selectedDay, setSelectedDay] = useState(mode === "nuit" || hour >= 18 ? 1 : 0);

  // Calculer la date pour le jour sélectionné
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + selectedDay);
  const dateStr = baseDate.toISOString().split("T")[0];

  const dayHourly = hourly.filter((h) => h.time.startsWith(dateStr));
  const dayNight = computeNightMetrics(hourly, dateStr);
  const dayMetrics = computeDayMetrics(hourly, dateStr);
  const dayAlerts = computeAlerts(hourly, dateStr, dayNight, dayMetrics);

  // Sunset pour le jour sélectionné
  const daySunset = sunsets[selectedDay];
  const sunsetLabel = daySunset
    ? `${new Date(daySunset).getHours()}h${String(new Date(daySunset).getMinutes()).padStart(2, "0")}`
    : null;

  // Créneaux 2h pour la vue horaire unifiée
  const slots = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22].map((startH) => {
    const block = dayHourly.filter((h) => {
      const hh = new Date(h.time).getHours();
      return hh >= startH && hh < startH + 2;
    });
    if (!block.length) return null;
    const avgTemp = Math.round(block.reduce((s, h) => s + h.temp, 0) / block.length);
    const avgRainProb = Math.round(block.reduce((s, h) => s + h.rainProb, 0) / block.length);
    const code = block[Math.floor(block.length / 2)]?.weathercode ?? 0;
    const isNow = selectedDay === 0 && hour >= startH && hour < startH + 2;
    return { startH, avgTemp, avgRainProb, code, isNow };
  }).filter(Boolean);

  // Mode nuit condensé
  const isNightMode = mode === "nuit" && selectedDay === 0;

  return (
    <div className="mt-4 space-y-4">
      {/* Toggle J / J+1 / J+2 */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">{city}</span>
        <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
          {DAY_LABELS_METEO.map((label, i) => (
            <button
              key={i}
              onClick={() => setSelectedDay(i)}
              className={`px-3 py-1 rounded-md text-2xs font-semibold transition-all ${
                selectedDay === i ? "bg-white text-black shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Résumé du jour sélectionné */}
      <div className="flex items-center gap-3 text-xs text-gray-600 flex-wrap">
        <span className="font-semibold text-black">
          {Math.round(dayMetrics.tmax - dayMetrics.amplitude)}° – {Math.round(dayMetrics.tmax)}°
        </span>
        <span className="text-gray-400">Nuit : {Math.round(dayNight.tmin)}°</span>
        {sunsetLabel && (
          <span className="text-gray-400">☀️ Coucher : {sunsetLabel}</span>
        )}
      </div>

      {/* Alertes du jour sélectionné */}
      {dayAlerts.length > 0 ? (
        <div className="space-y-1">
          {dayAlerts.map((alert) => (
            <div key={alert.id} className={`flex items-start gap-1.5 px-2.5 py-2 rounded-xl text-xs ${
              alert.severity === "danger" ? "bg-red-50 text-red-700" : "bg-orange-light text-gray-700"
            }`}>
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
              <span>{alert.message}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-green-600 flex items-center gap-1">✅ Conditions normales</p>
      )}

      {/* Vue horaire unifiée (sauf mode nuit pour aujourd'hui) */}
      {!isNightMode && (
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
            {selectedDay === 0 ? "Aujourd'hui" : DAY_LABELS_METEO[selectedDay]} — heure par heure
          </p>
          <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {slots.map((slot) => {
              if (!slot) return null;
              const { startH, avgTemp, avgRainProb, code, isNow } = slot;
              return (
                <div
                  key={startH}
                  className={`flex-shrink-0 flex flex-col items-center gap-1 px-2.5 py-2 rounded-xl min-w-[50px] ${
                    isNow ? "bg-black text-white" : "bg-gray-50"
                  }`}
                >
                  <span className={`text-2xs font-semibold ${isNow ? "text-gray-300" : "text-gray-400"}`}>
                    {startH}h
                  </span>
                  {getWeatherIcon(code, "h-4 w-4")}
                  <span className={`text-xs font-bold ${isNow ? "text-white" : "text-black"}`}>
                    {avgTemp}°
                  </span>
                  {avgRainProb > 10 && (
                    <span className={`text-2xs font-medium flex items-center gap-0.5 ${
                      isNow ? "text-blue-300" : avgRainProb >= 50 ? "text-blue-500" : "text-blue-400"
                    }`}>
                      <Droplets className="h-2.5 w-2.5" />{avgRainProb}%
                    </span>
                  )}
                </div>
              );
            })}
            {slots.length === 0 && (
              <p className="text-xs text-gray-400">Données non disponibles</p>
            )}
          </div>
        </div>
      )}

      {isNightMode && (
        <p className="text-xs text-gray-400 text-center py-2">
          Vue condensée — utilisez les onglets ci-dessus pour voir Demain ou J+2
        </p>
      )}

      <p className="text-2xs text-gray-300 text-right">
        Mis à jour à {loadedAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
      </p>
    </div>
  );
}
