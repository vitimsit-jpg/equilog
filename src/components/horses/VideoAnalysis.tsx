"use client";

import { useState, useRef } from "react";
import { Upload, Video, Play, Loader2, CheckCircle2, TrendingUp, TrendingDown, Lightbulb, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Horse {
  id: string;
  name: string;
  discipline?: string | null;
}

interface AnalysisResult {
  allure: string;
  score: number;
  posture_cheval: string;
  position_cavalier: string | null;
  points_forts: string[];
  axes_amelioration: string[];
  conseil_principal: string;
}

interface Props {
  horse: Horse;
}

const NUM_FRAMES = 6;

async function extractFrames(file: File): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.src = url;
    video.muted = true;
    video.preload = "metadata";

    video.addEventListener("loadedmetadata", async () => {
      const duration = video.duration;
      if (!isFinite(duration) || duration <= 0) {
        URL.revokeObjectURL(url);
        reject(new Error("Impossible de lire la durée de la vidéo"));
        return;
      }

      const canvas = document.createElement("canvas");
      canvas.width = 480;
      canvas.height = 270;
      const ctx = canvas.getContext("2d")!;
      const frames: string[] = [];

      for (let i = 0; i < NUM_FRAMES; i++) {
        const time = i === 0 ? 0.1 : (duration / (NUM_FRAMES - 1)) * i;
        video.currentTime = Math.min(time, duration - 0.1);
        await new Promise<void>((res) => {
          video.addEventListener("seeked", () => res(), { once: true });
        });
        ctx.drawImage(video, 0, 0, 480, 270);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.6);
        frames.push(dataUrl.split(",")[1]);
      }

      URL.revokeObjectURL(url);
      resolve(frames);
    });

    video.addEventListener("error", () => {
      URL.revokeObjectURL(url);
      reject(new Error("Erreur de lecture vidéo"));
    });
  });
}

function ScoreGauge({ score }: { score: number }) {
  const pct = (score / 10) * 100;
  const color = score >= 8 ? "#22c55e" : score >= 6 ? "#E8440A" : "#ef4444";
  const r = 40;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ * 0.75;
  const gap = circ - dash;
  const rotation = -225;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-24 h-24">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-[225deg]">
          <circle cx="50" cy="50" r={r} fill="none" stroke="#f3f4f6" strokeWidth="10"
            strokeDasharray={`${circ * 0.75} ${circ * 0.25}`} strokeLinecap="round" />
          <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="10"
            strokeDasharray={`${dash} ${gap + circ * 0.25}`} strokeLinecap="round"
            style={{ transition: "stroke-dasharray 0.8s ease" }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ transform: `rotate(${-rotation}deg)` }}>
          <span className="text-2xl font-black text-black leading-none">{score}</span>
          <span className="text-xs text-gray-400 font-medium">/10</span>
        </div>
      </div>
    </div>
  );
}

export default function VideoAnalysis({ horse }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [step, setStep] = useState<"idle" | "extracting" | "analyzing" | "done" | "error">("idle");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    if (!f.type.startsWith("video/")) return;
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setResult(null);
    setError(null);
    setStep("idle");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setError(null);
    try {
      setStep("extracting");
      const frames = await extractFrames(file);

      setStep("analyzing");
      const res = await fetch("/api/video-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frames, horseName: horse.name, discipline: horse.discipline }),
      });

      if (!res.ok) {
        let errMsg = `Erreur serveur (${res.status})`;
        try {
          const err = await res.json();
          errMsg = err.error || errMsg;
        } catch {}
        throw new Error(errMsg);
      }

      const data = await res.json();
      setResult(data);
      setStep("done");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Une erreur est survenue");
      setStep("error");
    }
  };

  const isLoading = step === "extracting" || step === "analyzing";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-black text-black">Analyse Vidéo</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Filmez une séance de {horse.name} et obtenez une analyse IA de sa gestuelle et de votre position.
        </p>
      </div>

      {/* Upload zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => !file && inputRef.current?.click()}
        className={cn(
          "relative rounded-2xl border-2 border-dashed transition-colors overflow-hidden",
          file ? "border-gray-200 cursor-default" : "border-gray-200 hover:border-orange cursor-pointer"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          capture="environment"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />

        {previewUrl ? (
          <div className="relative">
            <video
              src={previewUrl}
              className="w-full max-h-64 object-contain bg-black"
              controls
            />
            <button
              onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
              className="absolute top-3 right-3 bg-black/60 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-black/80 transition-colors"
            >
              Changer
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-12 px-6">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
              <Video className="h-7 w-7 text-gray-400" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-black text-sm">Déposer une vidéo</p>
              <p className="text-xs text-gray-400 mt-1">ou appuyez pour filmer / choisir</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span className="px-2 py-0.5 bg-gray-100 rounded">MP4</span>
              <span className="px-2 py-0.5 bg-gray-100 rounded">MOV</span>
              <span className="px-2 py-0.5 bg-gray-100 rounded">WebM</span>
              <span className="text-gray-300">•</span>
              <span>max ~200 Mo</span>
            </div>
          </div>
        )}
      </div>

      {/* Tips */}
      {!result && (
        <div className="bg-orange-light rounded-xl p-4 space-y-2">
          <p className="text-xs font-semibold text-orange">Conseils pour une meilleure analyse</p>
          <ul className="space-y-1">
            {["Filmez de profil ou de 3/4 pour capter le mouvement", "30 secondes minimum, lumière correcte", "Incluez le cheval entier dans le cadre"].map((tip) => (
              <li key={tip} className="flex items-start gap-2 text-xs text-gray-600">
                <ChevronRight className="h-3 w-3 text-orange mt-0.5 flex-shrink-0" />
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Analyze button */}
      {file && step !== "done" && (
        <button
          onClick={handleAnalyze}
          disabled={isLoading}
          className="w-full btn-primary flex items-center justify-center gap-2 py-3"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {step === "extracting" ? "Extraction des images…" : "Analyse en cours…"}
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Analyser la vidéo
            </>
          )}
        </button>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Score card */}
          <div className="card flex items-center gap-6">
            <ScoreGauge score={result.score} />
            <div className="flex-1">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Note globale</p>
              <p className="text-2xl font-black text-black mt-0.5">{result.score}/10</p>
              <span className="inline-block mt-1 px-2 py-0.5 bg-gray-100 rounded-full text-xs font-semibold text-gray-600 capitalize">
                {result.allure}
              </span>
            </div>
          </div>

          {/* Posture cheval */}
          <div className="card space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Posture du cheval</p>
            <p className="text-sm text-gray-700 leading-relaxed">{result.posture_cheval}</p>
          </div>

          {/* Position cavalier */}
          {result.position_cavalier && (
            <div className="card space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Position du cavalier</p>
              <p className="text-sm text-gray-700 leading-relaxed">{result.position_cavalier}</p>
            </div>
          )}

          {/* Points forts + Axes amélioration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="card space-y-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <p className="text-xs font-semibold text-gray-700">Points forts</p>
              </div>
              <ul className="space-y-2">
                {result.points_forts.map((p, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>

            <div className="card space-y-3">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-orange" />
                <p className="text-xs font-semibold text-gray-700">À améliorer</p>
              </div>
              <ul className="space-y-2">
                {result.axes_amelioration.map((a, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="w-3.5 h-3.5 rounded-full bg-orange-light flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange" />
                    </span>
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Conseil principal */}
          <div className="card bg-black text-white space-y-2">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-orange" />
              <p className="text-xs font-semibold text-orange uppercase tracking-wide">Conseil prioritaire</p>
            </div>
            <p className="text-sm leading-relaxed">{result.conseil_principal}</p>
          </div>

          {/* New analysis */}
          <button
            onClick={() => { setFile(null); setPreviewUrl(null); setResult(null); setStep("idle"); }}
            className="w-full btn-ghost flex items-center justify-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Analyser une autre vidéo
          </button>
        </div>
      )}
    </div>
  );
}
