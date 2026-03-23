"use client";

import { useState, useRef } from "react";
import { Upload, Camera, FolderOpen, Play, Loader2, CheckCircle2, TrendingUp, TrendingDown, Lightbulb, ChevronRight, History, ChevronDown, FileText, Save, Share2, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { haptic } from "@/lib/haptic";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from "recharts";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

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

interface SavedAnalysis extends AnalysisResult {
  id?: string;
  date: string; // ISO string
  video_url?: string | null;
  title?: string | null;
  notes?: string | null;
}

const NUM_FRAMES = 6;
const MAX_HISTORY = 5;

async function extractFrames(file: File): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.src = url;
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";

    video.addEventListener("loadedmetadata", async () => {
      const duration = video.duration;
      if (!isFinite(duration) || duration <= 0) {
        URL.revokeObjectURL(url);
        reject(new Error("Impossible de lire la durée de la vidéo"));
        return;
      }

      const vw = video.videoWidth;
      const vh = video.videoHeight;
      const isPortrait = vh > vw;
      const MAX = 480;
      let cw: number, ch: number;
      if (isPortrait) { ch = MAX; cw = Math.round((vw / vh) * MAX); }
      else { cw = MAX; ch = Math.round((vh / vw) * MAX); }

      const canvas = document.createElement("canvas");
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext("2d")!;
      const frames: string[] = [];

      for (let i = 0; i < NUM_FRAMES; i++) {
        const time = i === 0 ? 0.1 : (duration / (NUM_FRAMES - 1)) * i;
        video.currentTime = Math.min(time, duration - 0.1);
        await new Promise<void>((res) => {
          video.addEventListener("seeked", () => res(), { once: true });
        });
        ctx.drawImage(video, 0, 0, cw, ch);
        frames.push(canvas.toDataURL("image/jpeg", 0.65).split(",")[1]);
      }

      URL.revokeObjectURL(url);
      resolve(frames);
    });

    video.addEventListener("error", () => {
      URL.revokeObjectURL(url);
      reject(new Error("Format vidéo non supporté par ce navigateur. Sur iPhone, utilisez Safari ou convertissez en MP4."));
    });
  });
}

function ScoreGauge({ score }: { score: number }) {
  const color = score >= 8 ? "#22c55e" : score >= 6 ? "#E8440A" : "#ef4444";
  const r = 40;
  const circ = 2 * Math.PI * r;
  const dash = (score / 10) * circ * 0.75;
  const gap = circ - dash;

  return (
    <div className="relative w-24 h-24 flex-shrink-0">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-[225deg]">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#f3f4f6" strokeWidth="10"
          strokeDasharray={`${circ * 0.75} ${circ * 0.25}`} strokeLinecap="round" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={`${dash} ${gap + circ * 0.25}`} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.8s ease" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black text-black leading-none">{score}</span>
        <span className="text-xs text-gray-400 font-medium">/10</span>
      </div>
    </div>
  );
}

function AnalysisCard({ analysis, compact = false, onPlayVideo, onShare, shareState }: {
  analysis: SavedAnalysis;
  compact?: boolean;
  onPlayVideo?: () => void;
  onShare?: () => void;
  shareState?: "idle" | "loading" | "copied";
}) {
  const scoreColor = analysis.score >= 8 ? "text-green-500" : analysis.score >= 6 ? "text-orange" : "text-red-500";

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <div className={`text-2xl font-black ${scoreColor}`}>{analysis.score}<span className="text-xs text-gray-400 font-normal">/10</span></div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-semibold text-black truncate">
              {analysis.title || <span className="capitalize">{analysis.allure}</span>}
            </p>
            {analysis.notes && <FileText className="h-3 w-3 text-gray-400 flex-shrink-0" />}
          </div>
          <p className="text-xs text-gray-400 truncate">{analysis.conseil_principal}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {onPlayVideo && (
            <button onClick={onPlayVideo} className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors" title="Revoir la vidéo">
              <Play className="h-3 w-3 text-gray-600" />
            </button>
          )}
          {onShare && (
            <button onClick={onShare} className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors" title="Partager">
              {shareState === "loading" ? <Loader2 className="h-3 w-3 animate-spin text-gray-600" /> :
               shareState === "copied" ? <Check className="h-3 w-3 text-green-500" /> :
               <Share2 className="h-3 w-3 text-gray-600" />}
            </button>
          )}
          <p className="text-2xs text-gray-300">
            {new Date(analysis.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card flex items-center gap-6">
        <ScoreGauge score={analysis.score} />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Note globale</p>
          <p className="text-2xl font-black text-black mt-0.5">{analysis.score}/10</p>
          <span className="inline-block mt-1 px-2 py-0.5 bg-gray-100 rounded-full text-xs font-semibold text-gray-600 capitalize">
            {analysis.allure}
          </span>
        </div>
      </div>

      <div className="card space-y-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Posture du cheval</p>
        <p className="text-sm text-gray-700 leading-relaxed">{analysis.posture_cheval}</p>
      </div>

      {analysis.position_cavalier && (
        <div className="card space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Position du cavalier</p>
          <p className="text-sm text-gray-700 leading-relaxed">{analysis.position_cavalier}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <p className="text-xs font-semibold text-gray-700">Points forts</p>
          </div>
          <ul className="space-y-2">
            {analysis.points_forts.map((p, i) => (
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
            {analysis.axes_amelioration.map((a, i) => (
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

      <div className="card bg-black text-white space-y-2">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-orange" />
          <p className="text-xs font-semibold text-orange uppercase tracking-wide">Conseil prioritaire</p>
        </div>
        <p className="text-sm leading-relaxed">{analysis.conseil_principal}</p>
      </div>
    </div>
  );
}

function VideoScoreChart({ history }: { history: SavedAnalysis[] }) {
  const data = [...history]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((s) => ({
      label: format(parseISO(s.date), "d MMM", { locale: fr }),
      score: s.score,
      allure: s.allure,
    }));

  const avg = Math.round(data.reduce((sum, d) => sum + d.score, 0) / data.length);
  const trend = data.length >= 2 ? data[data.length - 1].score - data[0].score : 0;

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-orange" />
          <span className="text-sm font-bold text-black">Progression des scores</span>
          <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">{data.length} analyse{data.length > 1 ? "s" : ""}</span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-gray-400">Moy. <span className="font-bold text-black">{avg}/10</span></span>
          {trend !== 0 && (
            <span className={`font-bold ${trend > 0 ? "text-green-500" : "text-red-500"}`}>
              {trend > 0 ? "+" : ""}{trend} pts
            </span>
          )}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={140}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "#9CA3AF" }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[0, 10]}
            ticks={[0, 5, 10]}
            tick={{ fontSize: 10, fill: "#9CA3AF" }}
            tickLine={false}
            axisLine={false}
          />
          <ReferenceLine y={avg} stroke="#E8440A" strokeDasharray="4 3" strokeOpacity={0.4} />
          <Tooltip
            contentStyle={{ background: "#1A1A1A", border: "none", borderRadius: 8, color: "white", fontSize: 12 }}
            formatter={(value, _, props) => [`${value}/10 — ${props.payload?.allure ?? ""}`, "Score"]}
            labelStyle={{ color: "#9CA3AF" }}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke="#E8440A"
            strokeWidth={2.5}
            dot={{ r: 4, fill: "#E8440A", strokeWidth: 0 }}
            activeDot={{ r: 5, strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function VideoAnalysis({ horse, initialHistory = [], userId }: { horse: Horse; initialHistory?: SavedAnalysis[]; userId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [step, setStep] = useState<"idle" | "extracting" | "analyzing" | "done" | "error">("idle");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<SavedAnalysis[]>(initialHistory);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [currentAnalysisId, setCurrentAnalysisId] = useState<string | null>(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const saveToHistory = (analysis: AnalysisResult, id?: string) => {
    const entry: SavedAnalysis = { ...analysis, id, date: new Date().toISOString(), video_url: null, title: null, notes: null };
    setHistory((prev) => [entry, ...prev].slice(0, MAX_HISTORY));
  };

  const handleSaveNote = async () => {
    if (!currentAnalysisId || noteSaving) return;
    setNoteSaving(true);
    try {
      const supabase = createClient();
      await supabase.from("video_analyses")
        .update({ title: noteTitle.trim() || null, notes: noteContent.trim() || null })
        .eq("id", currentAnalysisId);
      setHistory((prev) =>
        prev.map((item) =>
          item.id === currentAnalysisId
            ? { ...item, title: noteTitle.trim() || null, notes: noteContent.trim() || null }
            : item
        )
      );
      setNoteSaved(true);
    } finally {
      setNoteSaving(false);
    }
  };

  const handleShare = async (analysisId: string) => {
    if (sharingId) return;
    setSharingId(analysisId);
    try {
      const res = await fetch("/api/video-analysis/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisId }),
      });
      const { shareUrl } = await res.json();
      await navigator.clipboard.writeText(shareUrl);
      setCopiedId(analysisId);
      setTimeout(() => setCopiedId(null), 2500);
    } finally {
      setSharingId(null);
    }
  };

  const uploadVideoBackground = async (f: File, analysisId: string) => {
    try {
      const supabase = createClient();
      const ext = f.name.split(".").pop()?.toLowerCase() || "mp4";
      const path = `${userId}/${horse.id}/${analysisId}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("video-analyses")
        .upload(path, f, { contentType: f.type, cacheControl: "3600" });
      if (uploadError) return;
      await supabase.from("video_analyses").update({ video_url: path }).eq("id", analysisId);
      setHistory((prev) =>
        prev.map((item) => (item.id === analysisId ? { ...item, video_url: path } : item))
      );
    } catch {}
  };

  const handlePlayVideo = async (videoPath: string) => {
    const supabase = createClient();
    const { data } = await supabase.storage.from("video-analyses").createSignedUrl(videoPath, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const handleFile = (f: File) => {
    if (!f.type.startsWith("video/")) return;
    setFile(f);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
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
    haptic("medium");
    try {
      setStep("extracting");
      const frames = await extractFrames(file);

      setStep("analyzing");
      const res = await fetch("/api/video-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frames, horseName: horse.name, discipline: horse.discipline, horseId: horse.id }),
      });

      if (!res.ok) {
        let errMsg = `Erreur serveur (${res.status})`;
        try { const err = await res.json(); errMsg = err.error || errMsg; } catch {}
        throw new Error(errMsg);
      }

      const { analysisId, ...data } = await res.json();
      setResult(data);
      saveToHistory(data, analysisId);
      setCurrentAnalysisId(analysisId ?? null);
      const today = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
      setNoteTitle(`${data.allure.charAt(0).toUpperCase() + data.allure.slice(1)} — ${today}`);
      setNoteContent("");
      setNoteSaved(false);
      haptic("success");
      setStep("done");

      // Upload video in background after showing result
      if (analysisId && file) {
        uploadVideoBackground(file, analysisId);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Une erreur est survenue");
      haptic("error");
      setStep("error");
    }
  };

  const reset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    setStep("idle");
    setCurrentAnalysisId(null);
    setNoteTitle("");
    setNoteContent("");
    setNoteSaved(false);
  };

  const isLoading = step === "extracting" || step === "analyzing";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-black text-black">Analyse Vidéo</h1>
          <span className="text-2xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">Bientôt disponible</span>
        </div>
        <p className="text-sm text-gray-500 mt-0.5">
          Filmez {horse.name} et obtenez une analyse IA de sa locomotion et de votre position.
        </p>
      </div>

      {/* Hidden inputs */}
      <input ref={cameraRef} type="file" accept="video/mp4,video/quicktime,video/x-m4v,video/*"
        capture="environment" className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
      <input ref={fileRef} type="file" accept="video/mp4,video/quicktime,video/x-m4v,video/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />

      {/* Video preview or upload zone */}
      {previewUrl ? (
        <div className="relative rounded-2xl overflow-hidden border border-gray-100 bg-black"
          onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
          <video src={previewUrl} className="w-full max-h-72 object-contain" controls playsInline />
          <button onClick={reset}
            className="absolute top-3 right-3 bg-black/60 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-black/80 transition-colors">
            Changer
          </button>
        </div>
      ) : (
        <div onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}
          className="rounded-2xl border-2 border-dashed border-gray-200 py-10 px-6 flex flex-col items-center gap-5">
          <div className="flex gap-3 w-full max-w-xs">
            <button onClick={() => cameraRef.current?.click()}
              className="flex-1 flex flex-col items-center gap-2 py-4 rounded-xl bg-black text-white font-semibold text-sm hover:bg-gray-900 transition-colors">
              <Camera className="h-5 w-5" />
              Filmer
            </button>
            <button onClick={() => fileRef.current?.click()}
              className="flex-1 flex flex-col items-center gap-2 py-4 rounded-xl bg-gray-100 text-black font-semibold text-sm hover:bg-gray-200 transition-colors">
              <FolderOpen className="h-5 w-5" />
              Importer
            </button>
          </div>
          <p className="text-xs text-gray-400 text-center">ou glissez-déposez une vidéo ici</p>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="px-2 py-0.5 bg-gray-100 rounded">MP4</span>
            <span className="px-2 py-0.5 bg-gray-100 rounded">MOV</span>
            <span className="px-2 py-0.5 bg-gray-100 rounded">WebM</span>
            <span className="text-gray-300">•</span>
            <span>portrait ou paysage</span>
          </div>
        </div>
      )}

      {/* Tips */}
      {!result && (
        <div className="bg-orange-light rounded-xl p-4 space-y-2">
          <p className="text-xs font-semibold text-orange">Conseils pour une meilleure analyse</p>
          <ul className="space-y-1">
            {[
              "Filmez de profil ou 3/4 pour capter le mouvement",
              "30 secondes minimum, bonne luminosité",
              "Cadrez le cheval entier (tête + sabots)",
              "iPhone : utilisez Safari pour de meilleurs résultats",
            ].map((tip) => (
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
        <button onClick={handleAnalyze} disabled={isLoading}
          className="w-full btn-primary flex items-center justify-center gap-2 py-3.5 text-base">
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {step === "extracting" ? "Extraction des images…" : "Analyse IA en cours…"}
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
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-600 leading-relaxed">
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          <AnalysisCard analysis={{ ...result, date: new Date().toISOString() }} />

          {/* Title & notes form */}
          <div className="card space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-orange" />
              <span className="text-sm font-bold text-black">Nommer cette séance</span>
            </div>
            <input
              type="text"
              value={noteTitle}
              onChange={(e) => { setNoteTitle(e.target.value); setNoteSaved(false); }}
              placeholder="ex: Travail sur le galop — 17 mars"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-orange"
            />
            <textarea
              value={noteContent}
              onChange={(e) => { setNoteContent(e.target.value); setNoteSaved(false); }}
              placeholder="Notes de la séance (optionnel)"
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-orange resize-none"
            />
            <button
              onClick={handleSaveNote}
              disabled={noteSaving || noteSaved}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black text-white text-sm font-semibold hover:bg-gray-900 transition-colors disabled:opacity-50"
            >
              {noteSaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              {noteSaved ? "Enregistré ✓" : "Enregistrer"}
            </button>
          </div>

          {currentAnalysisId && (
            <button
              onClick={() => handleShare(currentAnalysisId)}
              disabled={sharingId === currentAnalysisId}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:border-gray-400 transition-colors disabled:opacity-50"
            >
              {sharingId === currentAnalysisId ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : copiedId === currentAnalysisId ? (
                <><Check className="h-4 w-4 text-green-500" /> Lien copié ✓</>
              ) : (
                <><Share2 className="h-4 w-4" /> Partager avec mon coach</>
              )}
            </button>
          )}

          <button onClick={reset} className="w-full btn-ghost flex items-center justify-center gap-2">
            <Upload className="h-4 w-4" />
            Analyser une autre vidéo
          </button>
        </div>
      )}

      {/* ── Analyse photo ──────────────────────────────────────────────── */}
      <div className="card space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-base font-bold text-black">Analyse photo</h2>
            <span className="text-2xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">Bientôt disponible</span>
          </div>
          <p className="text-sm text-gray-500">
            Prenez des photos de {horse.name} pour obtenir une analyse IA de sa morphologie.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Photo de face",      icon: "⬆️" },
            { label: "Profil gauche",       icon: "⬅️" },
            { label: "Profil droit",        icon: "➡️" },
            { label: "Photo de dos",        icon: "⬇️" },
          ].map((slot) => (
            <div
              key={slot.label}
              className="flex flex-col items-center justify-center gap-2 py-6 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed select-none"
            >
              <span className="text-2xl">{slot.icon}</span>
              <span className="text-xs font-semibold text-gray-500 text-center leading-tight">{slot.label}</span>
              <span className="text-2xs text-gray-300">Bientôt disponible</span>
            </div>
          ))}
        </div>
      </div>

      {/* Analyse du cavalier */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🏇</span>
            <h2 className="font-bold text-black">Analyse du cavalier</h2>
          </div>
        </div>
        <p className="text-sm text-gray-400 leading-relaxed mb-4">
          Enregistrez une vidéo de votre position pour obtenir une analyse IA de votre symétrie et de votre assiette.
        </p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {["Position en selle", "Équilibre", "Coordination", "Assiette"].map((item) => (
            <div key={item} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl opacity-50">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
              <span className="text-xs text-gray-500">{item}</span>
            </div>
          ))}
        </div>
        <button
          disabled
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 text-gray-400 text-sm font-semibold cursor-not-allowed"
        >
          <Upload className="h-4 w-4" />
          Analyser ma position
          <span className="ml-1 text-2xs font-semibold px-2 py-0.5 rounded-full bg-gray-200 text-gray-400">Bientôt disponible</span>
        </button>
      </div>

      {/* Score progression chart */}
      {history.length >= 2 && <VideoScoreChart history={history} />}

      {/* History */}
      {history.length > 0 && (
        <div className="card">
          <button
            onClick={() => setHistoryOpen((o) => !o)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-orange" />
              <span className="text-sm font-bold text-black">Historique des analyses</span>
              <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">{history.length}</span>
            </div>
            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${historyOpen ? "rotate-180" : ""}`} />
          </button>

          {historyOpen && (
            <div className="mt-4 space-y-3 divide-y divide-gray-50">
              {history.map((item, i) => (
                <div key={i} className={i > 0 ? "pt-3" : ""}>
                  <AnalysisCard
                    analysis={item}
                    compact
                    onPlayVideo={item.video_url ? () => handlePlayVideo(item.video_url!) : undefined}
                    onShare={item.id ? () => handleShare(item.id!) : undefined}
                    shareState={sharingId === item.id ? "loading" : copiedId === item.id ? "copied" : "idle"}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
