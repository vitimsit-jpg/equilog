"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import type { TrainingType } from "@/lib/supabase/types";

interface VoiceResult {
  type: TrainingType;
  duration_min: number;
  intensity: 1 | 2 | 3 | 4 | 5;
  feeling: 1 | 2 | 3 | 4 | 5;
  notes: string | null;
  rider?: string | null;
  lieu?: string | null;
  objectif?: string | null;
}

interface Props {
  onResult: (data: VoiceResult) => void;
}

type RecordingState = "idle" | "recording" | "processing";

export default function VoiceButton({ onResult }: Props) {
  const [state, setState] = useState<RecordingState>("idle");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef<string>("");
  const hadErrorRef = useRef(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    setSupported(!!(w.SpeechRecognition || w.webkitSpeechRecognition));
  }, []);

  const startRecording = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SpeechRecognitionAPI = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition: any = new SpeechRecognitionAPI();
    recognition.lang = "fr-FR";
    recognition.continuous = true;
    recognition.interimResults = false;
    transcriptRef.current = "";
    hadErrorRef.current = false;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcriptRef.current += event.results[i][0].transcript + " ";
      }
    };

    recognition.onend = async () => {
      if (hadErrorRef.current) return; // already handled by onerror
      const text = transcriptRef.current.trim();
      if (!text) {
        setState("idle");
        toast.error("Aucune parole détectée");
        return;
      }
      setState("processing");
      try {
        const res = await fetch("/api/voice-transcribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript: text }),
        });
        const data = await res.json();
        // Route always returns 200 (EMPTY_RESULT on failure) — check if at least one field was extracted
        const hasData = data.type || data.duration_min || data.intensity;
        onResult(data);
        if (hasData) {
          toast.success("Séance pré-remplie depuis votre description !");
        } else {
          toast("Dictée reçue — vérifiez les champs", { icon: "✏️" });
        }
      } catch {
        toast.error("Erreur lors de l'analyse vocale");
      }
      setState("idle");
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      // "aborted" fires normally when stop() is called — not a real error
      if (event.error === "aborted") return;
      hadErrorRef.current = true;
      setState("idle");
      if (event.error === "not-allowed") {
        toast.error("Permission microphone refusée — autorisez le micro dans les réglages du navigateur");
      } else if (event.error === "network") {
        toast.error("Erreur réseau — vérifiez votre connexion et réessayez");
      } else if (event.error === "no-speech") {
        toast("Aucune parole détectée", { icon: "🎤" });
      } else {
        toast.error(`Erreur microphone (${event.error})`);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setState("recording");
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
  };

  if (!supported) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-100 border border-gray-200 w-full">
        <MicOff className="h-5 w-5 text-gray-400 flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-gray-500">Saisie vocale non disponible</p>
          <p className="text-2xs text-gray-400">Utilisez Chrome ou Safari pour dicter vos séances.</p>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={state === "recording" ? stopRecording : startRecording}
      disabled={state === "processing"}
      className={`w-full flex items-center justify-center gap-3 rounded-xl font-bold text-sm transition-all ${
        state === "recording"
          ? "bg-red-500 text-white animate-pulse shadow-lg"
          : state === "processing"
          ? "bg-gray-200 text-gray-500 cursor-not-allowed"
          : "bg-orange text-white hover:bg-orange/90 active:scale-[0.98]"
      }`}
      style={{ minHeight: 64 }}
    >
      {state === "processing" ? (
        <Loader2 className="h-5 w-5 animate-spin flex-shrink-0" />
      ) : state === "recording" ? (
        <MicOff className="h-5 w-5 flex-shrink-0" />
      ) : (
        <Mic className="h-5 w-5 flex-shrink-0" />
      )}
      <span>
        {state === "recording"
          ? "Enregistrement… Appuyez pour arrêter"
          : state === "processing"
          ? "Analyse en cours…"
          : "🎤 Dicter ma séance"}
      </span>
    </button>
  );
}
