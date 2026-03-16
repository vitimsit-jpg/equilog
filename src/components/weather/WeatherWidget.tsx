"use client";

import { useEffect, useState } from "react";
import { CloudRain, Sun, Cloud, Wind, Thermometer, CloudSnow, Zap, CloudDrizzle, AlertTriangle } from "lucide-react";

interface WeatherData {
  temperature: number;
  weathercode: number;
  windspeed: number;
  precipitation: number;
  humidity: number;
  city: string | null;
}

function getWeatherInfo(code: number): { label: string; Icon: React.ElementType; color: string } {
  if (code === 0) return { label: "Ciel dégagé", Icon: Sun, color: "text-yellow-500" };
  if (code <= 3) return { label: "Partiellement nuageux", Icon: Cloud, color: "text-gray-400" };
  if (code <= 48) return { label: "Brouillard", Icon: Cloud, color: "text-gray-400" };
  if (code <= 55) return { label: "Bruine", Icon: CloudDrizzle, color: "text-blue-400" };
  if (code <= 65) return { label: "Pluie", Icon: CloudRain, color: "text-blue-500" };
  if (code <= 77) return { label: "Neige", Icon: CloudSnow, color: "text-blue-200" };
  if (code <= 82) return { label: "Averses", Icon: CloudRain, color: "text-blue-500" };
  if (code <= 99) return { label: "Orage", Icon: Zap, color: "text-yellow-600" };
  return { label: "Variable", Icon: Cloud, color: "text-gray-400" };
}

function getRecommendation(w: WeatherData): { text: string; color: string; level: "good" | "caution" | "bad" } {
  const { temperature: t, weathercode: c, windspeed: ws, precipitation: p } = w;
  if (c >= 95) return { text: "Orage en cours — ne sortez pas les chevaux", color: "text-danger", level: "bad" };
  if (c >= 71 && c <= 77) return { text: "Neige — sol glissant, vérifiez la carrière avant de monter", color: "text-danger", level: "bad" };
  if (p > 5 || c === 65 || c === 82) return { text: "Fortes pluies — séance en carrière couverte recommandée", color: "text-warning", level: "caution" };
  if (ws > 40) return { text: "Vent fort — prudence en extérieur, certains chevaux peuvent être agités", color: "text-warning", level: "caution" };
  if (t < 0) return { text: "Gel — vérifiez le sol avant la séance, attention à l'hydratation", color: "text-warning", level: "caution" };
  if (t > 30) return { text: `Chaleur (${Math.round(t)}°C) — travaillez tôt le matin ou en soirée, hydratation +++`, color: "text-warning", level: "caution" };
  if (c >= 51 && c <= 63) return { text: "Pluie légère — carrière couverte conseillée", color: "text-blue-500", level: "caution" };
  if (ws > 25) return { text: "Vent modéré — restez attentif au comportement de votre cheval", color: "text-gray-500", level: "caution" };
  if (t >= 0 && t < 5) return { text: "Froid — échauffement plus long conseillé avant le travail", color: "text-gray-500", level: "caution" };
  if (t >= 5 && t <= 25 && c <= 3 && ws < 20) return { text: "Conditions idéales pour une séance en extérieur", color: "text-success", level: "good" };
  return { text: "Conditions correctes pour une séance", color: "text-success", level: "good" };
}

export default function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const ipRes = await fetch("https://freeipapi.com/api/json");
        const ipData = await ipRes.json();
        const lat = ipData.latitude;
        const lon = ipData.longitude;
        const city = ipData.cityName || ipData.regionName || null;

        const meteoRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weathercode,windspeed_10m,precipitation,relative_humidity_2m&forecast_days=1`
        );
        const meteo = await meteoRes.json();

        setWeather({
          temperature: meteo.current.temperature_2m,
          weathercode: meteo.current.weathercode,
          windspeed: meteo.current.windspeed_10m,
          precipitation: meteo.current.precipitation,
          humidity: meteo.current.relative_humidity_2m,
          city,
        });
      } catch {
        setError(true);
      }
    }
    load();
  }, []);

  if (error) return (
    <div className="card border border-gray-100">
      <p className="text-sm text-gray-400">Météo non disponible</p>
    </div>
  );

  if (!weather) return (
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

  const { label, Icon, color } = getWeatherInfo(weather.weathercode);
  const rec = getRecommendation(weather);
  const bgClass = rec.level === "good"
    ? "from-green-50 to-white border-green-100"
    : rec.level === "bad"
    ? "from-red-50 to-white border-red-100"
    : "from-blue-50 to-white border-blue-100";

  return (
    <div className={`card bg-gradient-to-br ${bgClass} border`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center flex-shrink-0">
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xl font-black text-black">{Math.round(weather.temperature)}°C</span>
              <span className="text-sm text-gray-500">{label}</span>
              {weather.city && <span className="text-xs text-gray-400">— {weather.city}</span>}
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Wind className="h-3 w-3" />{Math.round(weather.windspeed)} km/h
              </span>
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Thermometer className="h-3 w-3" />{weather.humidity}% humidité
              </span>
            </div>
          </div>
        </div>
        {rec.level !== "good" && (
          <AlertTriangle className={`h-4 w-4 flex-shrink-0 mt-0.5 ${rec.level === "bad" ? "text-danger" : "text-warning"}`} />
        )}
      </div>
      <div className={`mt-3 pt-3 border-t border-black/5 text-xs font-medium ${rec.color}`}>
        {rec.text}
      </div>
    </div>
  );
}
