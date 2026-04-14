"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Play, Pause, Square, MapPin, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";

const BaladeMap = dynamic(() => import("./BaladeMap"), { ssr: false });

// ── Types ────────────────────────────────────────────────────────────────────

interface Coordinate {
  lat: number;
  lng: number;
  alt?: number;
  ts: number;
}

interface Props {
  horseId: string;
  horseName: string;
}

// ── Haversine ────────────────────────────────────────────────────────────────

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

// ── Composant ────────────────────────────────────────────────────────────────

type Phase = "idle" | "tracking" | "paused" | "summary";

const FEELING_OPTIONS = [
  { value: 5, emoji: "😄", label: "Super" },
  { value: 4, emoji: "🙂", label: "Bien" },
  { value: 3, emoji: "😐", label: "Normal" },
  { value: 2, emoji: "😕", label: "Moyen" },
  { value: 1, emoji: "🤕", label: "Difficile" },
];

const INTENSITY_OPTIONS = [
  { value: 1, label: "Léger" },
  { value: 3, label: "Normal" },
  { value: 5, label: "Intense" },
];

export default function BaladeTracker({ horseId, horseName }: Props) {
  const router = useRouter();

  // ── State ──────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>("idle");
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [signalLost, setSignalLost] = useState(false);
  const [saving, setSaving] = useState(false);

  // Tracking data (useRef pour perf)
  const coordsRef = useRef<Coordinate[]>([]);
  const watchIdRef = useRef<number | null>(null);
  const lastPointTimeRef = useRef(0);
  const startTimeRef = useRef<Date | null>(null);
  const signalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxSpeedRef = useRef(0); // km/h
  const pausedDurationRef = useRef(0); // ms cumulé en pause
  const pauseStartRef = useRef<number | null>(null);

  // Displayable state
  const [displayCoords, setDisplayCoords] = useState<{ lat: number; lng: number }[]>([]);
  const [currentPos, setCurrentPos] = useState<{ lat: number; lng: number } | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [distance, setDistance] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Summary form
  const [feeling, setFeeling] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [intensity, setIntensity] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [notes, setNotes] = useState("");

  // ── Cleanup helpers ────────────────────────────────────────────────────────

  const clearWatch = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const clearSignalTimer = () => {
    if (signalTimerRef.current) {
      clearTimeout(signalTimerRef.current);
      signalTimerRef.current = null;
    }
  };

  // ── GPS handlers ───────────────────────────────────────────────────────────

  const onPosition = useCallback((pos: GeolocationPosition) => {
    const now = Date.now();
    if (now - lastPointTimeRef.current < 3000) return;
    lastPointTimeRef.current = now;

    setSignalLost(false);
    clearSignalTimer();
    signalTimerRef.current = setTimeout(() => setSignalLost(true), 15000);

    const coord: Coordinate = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      alt: pos.coords.altitude ?? undefined,
      ts: now,
    };

    const prev = coordsRef.current[coordsRef.current.length - 1];
    if (prev) {
      const d = haversineKm(prev, coord);
      if (d < 0.001) return; // filtre anti-bruit : < 1m

      // Calcul vitesse entre les 2 points
      const dtHours = (coord.ts - prev.ts) / 3600000;
      if (dtHours > 0) {
        const speed = d / dtHours;
        if (speed > maxSpeedRef.current && speed < 80) { // cap 80 km/h anti-GPS-jump
          maxSpeedRef.current = speed;
        }
      }

      setDistance((prev) => prev + d);
    }

    coordsRef.current.push(coord);
    setCurrentPos({ lat: coord.lat, lng: coord.lng });
    setDisplayCoords(coordsRef.current.map((c) => ({ lat: c.lat, lng: c.lng })));
  }, []);

  const onGpsError = useCallback((err: GeolocationPositionError) => {
    if (err.code === 1) {
      setGpsError("Permission GPS refusée. Vous pouvez enregistrer une balade sans tracé via le journal de travail.");
    } else {
      setGpsError("GPS indisponible : " + err.message);
    }
  }, []);

  // ── Start / pause / resume / stop ──────────────────────────────────────────

  const startWatch = () => {
    watchIdRef.current = navigator.geolocation.watchPosition(onPosition, onGpsError, {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 10000,
    });
  };

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      if (startTimeRef.current) {
        const raw = Date.now() - startTimeRef.current.getTime();
        setElapsed(Math.floor((raw - pausedDurationRef.current) / 1000));
      }
    }, 1000);
  };

  const startTracking = () => {
    if (!navigator.geolocation) {
      setGpsError("La géolocalisation n'est pas supportée par votre navigateur.");
      return;
    }
    setGpsError(null);
    coordsRef.current = [];
    setDisplayCoords([]);
    setDistance(0);
    setElapsed(0);
    maxSpeedRef.current = 0;
    pausedDurationRef.current = 0;
    pauseStartRef.current = null;
    startTimeRef.current = new Date();
    setPhase("tracking");
    startWatch();
    startTimer();
  };

  const pauseTracking = () => {
    clearWatch();
    clearTimer();
    clearSignalTimer();
    setSignalLost(false);
    pauseStartRef.current = Date.now();
    setPhase("paused");
  };

  const resumeTracking = () => {
    // Comptabiliser la durée de pause
    if (pauseStartRef.current) {
      pausedDurationRef.current += Date.now() - pauseStartRef.current;
      pauseStartRef.current = null;
    }
    setPhase("tracking");
    startWatch();
    startTimer();
  };

  const stopTracking = () => {
    clearWatch();
    clearTimer();
    clearSignalTimer();
    setSignalLost(false);
    if (pauseStartRef.current) {
      pausedDurationRef.current += Date.now() - pauseStartRef.current;
      pauseStartRef.current = null;
    }
    setPhase("summary");
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearWatch();
      clearTimer();
      clearSignalTimer();
    };
  }, []);

  // ── Save ───────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!startTimeRef.current) return;
    setSaving(true);

    const coords = coordsRef.current;
    const durationMin = Math.round(elapsed / 60) || 1;

    // Calcul dénivelé
    let elevationGain = 0;
    let hasAltitude = false;
    for (let i = 1; i < coords.length; i++) {
      const prev = coords[i - 1].alt;
      const curr = coords[i].alt;
      if (prev != null && curr != null) {
        hasAltitude = true;
        if (curr > prev) elevationGain += curr - prev;
      }
    }

    const avgSpeed = elapsed > 0 ? (distance / (elapsed / 3600)) : 0;

    try {
      const res = await fetch("/api/balade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          horse_id: horseId,
          coordinates: coords,
          distance_km: Math.round(distance * 100) / 100,
          elevation_gain_m: hasAltitude ? Math.round(elevationGain * 10) / 10 : null,
          avg_speed_kmh: Math.round(avgSpeed * 10) / 10,
          max_speed_kmh: maxSpeedRef.current > 0 ? Math.round(maxSpeedRef.current * 10) / 10 : null,
          started_at: startTimeRef.current.toISOString(),
          finished_at: new Date().toISOString(),
          duration_min: durationMin,
          feeling,
          intensity,
          notes: notes.trim() || null,
          media_urls: [],
        }),
      });

      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "Erreur" }));
        throw new Error(error);
      }

      toast.success("Balade enregistrée !");
      router.push(`/horses/${horseId}/training`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'enregistrement");
      setSaving(false);
    }
  };

  // ── Format helpers ─────────────────────────────────────────────────────────

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h > 0 ? `${h}:` : ""}${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  // IDLE
  if (phase === "idle") {
    return (
      <div className="max-w-lg mx-auto text-center py-16 px-4 space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-orange-light flex items-center justify-center mx-auto">
          <MapPin className="h-10 w-10 text-orange" />
        </div>
        <div>
          <h2 className="text-xl font-black text-black mb-2">Balade GPS</h2>
          <p className="text-sm text-gray-500">{horseName}</p>
          <p className="text-xs text-gray-400 mt-2 max-w-xs mx-auto">
            Enregistrez votre parcours en temps réel. Le tracé, la distance et la durée seront sauvegardés automatiquement.
          </p>
        </div>
        {gpsError && (
          <div className="card border border-red-200 bg-red-50 text-left">
            <div className="flex gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{gpsError}</p>
            </div>
          </div>
        )}
        <button onClick={startTracking} className="btn-primary text-lg px-8 py-4">
          <Play className="h-5 w-5 mr-2 inline" />
          Démarrer la balade
        </button>
      </div>
    );
  }

  // TRACKING / PAUSED
  if (phase === "tracking" || phase === "paused") {
    return (
      <div className="relative flex flex-col" style={{ height: "calc(100vh - 120px)" }}>
        {/* Carte */}
        <div className="flex-1 relative">
          <BaladeMap
            coordinates={displayCoords}
            currentPosition={currentPos}
            interactive
            height="100%"
          />
          {signalLost && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[400] bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
              <AlertTriangle className="h-3 w-3" />
              Signal GPS perdu
            </div>
          )}
          {phase === "paused" && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[400] bg-gray-800 text-white text-xs font-bold px-3 py-1.5 rounded-full">
              En pause
            </div>
          )}
        </div>

        {/* Overlay stats + contrôles */}
        <div className="bg-white border-t border-gray-100 rounded-t-2xl shadow-lg px-4 py-4 space-y-3 z-[400]">
          <div className="flex items-center justify-between">
            <p className="text-3xl font-black text-black tracking-tight">{formatTime(elapsed)}</p>
            <div className="flex gap-4 text-center">
              <div>
                <p className="text-lg font-bold text-black">{distance.toFixed(2)}</p>
                <p className="text-2xs text-gray-400">km</p>
              </div>
              <div>
                <p className="text-lg font-bold text-black">
                  {elapsed > 0 ? (distance / (elapsed / 3600)).toFixed(1) : "0.0"}
                </p>
                <p className="text-2xs text-gray-400">km/h</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {phase === "tracking" ? (
              <button onClick={pauseTracking} className="flex-1 btn-ghost flex items-center justify-center gap-2 py-3">
                <Pause className="h-4 w-4" />
                Pause
              </button>
            ) : (
              <button onClick={resumeTracking} className="flex-1 btn-primary flex items-center justify-center gap-2 py-3">
                <Play className="h-4 w-4" />
                Reprendre
              </button>
            )}
            <button
              onClick={stopTracking}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-colors"
            >
              <Square className="h-4 w-4" />
              Arrêter
            </button>
          </div>
        </div>
      </div>
    );
  }

  // SUMMARY
  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      <h2 className="text-lg font-black text-black">Résumé de la balade</h2>

      <div className="rounded-xl overflow-hidden border border-gray-100" style={{ height: "200px" }}>
        <BaladeMap coordinates={displayCoords} interactive={false} height="200px" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="stat-card text-center">
          <p className="text-lg font-black text-black">{formatTime(elapsed)}</p>
          <p className="text-2xs text-gray-400">Durée</p>
        </div>
        <div className="stat-card text-center">
          <p className="text-lg font-black text-black">{distance.toFixed(2)} km</p>
          <p className="text-2xs text-gray-400">Distance</p>
        </div>
        <div className="stat-card text-center">
          <p className="text-lg font-black text-black">
            {elapsed > 0 ? (distance / (elapsed / 3600)).toFixed(1) : "0"} km/h
          </p>
          <p className="text-2xs text-gray-400">Vitesse moy.</p>
        </div>
      </div>

      {/* Feeling */}
      <div>
        <p className="label mb-2">Ressenti du cheval</p>
        <div className="flex gap-2">
          {FEELING_OPTIONS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFeeling(f.value as 1 | 2 | 3 | 4 | 5)}
              className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl border-2 transition-all ${
                feeling === f.value ? "border-orange bg-orange-light" : "border-gray-200"
              }`}
            >
              <span className="text-xl">{f.emoji}</span>
              <span className="text-2xs font-semibold text-gray-600">{f.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Intensité */}
      <div>
        <p className="label mb-2">Intensité</p>
        <div className="flex gap-2">
          {INTENSITY_OPTIONS.map((i) => (
            <button
              key={i.value}
              onClick={() => setIntensity(i.value as 1 | 2 | 3 | 4 | 5)}
              className={`flex-1 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${
                intensity === i.value ? "border-orange bg-orange-light text-orange" : "border-gray-200 text-gray-500"
              }`}
            >
              {i.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div>
        <p className="label mb-2">Notes</p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Comment s'est passée la balade ?"
          className="input min-h-[80px]"
        />
      </div>

      <button
        onClick={handleSave}
        disabled={saving || coordsRef.current.length < 2}
        className="btn-primary w-full py-3.5 text-base font-bold disabled:opacity-50"
      >
        {saving ? "Enregistrement..." : coordsRef.current.length < 2 ? "Pas assez de points GPS" : "Enregistrer la balade"}
      </button>
    </div>
  );
}
