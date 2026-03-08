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
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    if (!w.SpeechRecognition && !w.webkitSpeechRecognition) {
      setSupported(false);
    }
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcriptRef.current += event.results[i][0].transcript + " ";
      }
    };

    recognition.onend = async () => {
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
        if (!res.ok) throw new Error();
        const data = await res.json();
        onResult(data);
        toast.success("Séance pré-remplie depuis votre description !");
      } catch {
        toast.error("Erreur lors de l'analyse vocale");
      }
      setState("idle");
    };

    recognition.onerror = () => {
      setState("idle");
      toast.error("Erreur microphone");
    };

    recognitionRef.current = recognition;
    recognition.start();
    setState("recording");
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
  };

  if (!supported) return null;

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-beige border border-orange/20">
      <button
        type="button"
        onClick={state === "recording" ? stopRecording : startRecording}
        disabled={state === "processing"}
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
          state === "recording"
            ? "bg-red-500 text-white animate-pulse shadow-lg"
            : state === "processing"
            ? "bg-gray-200 text-gray-400 cursor-not-allowed"
            : "bg-orange text-white hover:bg-orange/90"
        }`}
      >
        {state === "processing" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : state === "recording" ? (
          <MicOff className="h-4 w-4" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </button>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-black">
          {state === "recording"
            ? "Enregistrement en cours... (cliquez pour arrêter)"
            : state === "processing"
            ? "Analyse IA en cours..."
            : "Dicter votre séance"}
        </p>
        <p className="text-xs text-gray-400 truncate">
          {state === "idle"
            ? "Ex : \"Dressage 45 min, intensité moyenne, bon ressenti, transitions\""
            : state === "recording"
            ? "Parlez naturellement, décrivez la séance..."
            : "Claude structure vos données..."}
        </p>
      </div>
    </div>
  );
}
