"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AlertTriangle, X, ChevronDown } from "lucide-react";
import toast from "react-hot-toast";
import type { HorseAlert, AlertUrgency } from "@/lib/supabase/types";

const URGENCY_LABELS: Record<AlertUrgency, string> = {
  normal: "Normal",
  urgent: "Urgent",
  critique: "Critique",
};

const URGENCY_STYLES: Record<AlertUrgency, string> = {
  normal: "text-orange bg-orange-light",
  urgent: "text-red-600 bg-red-50",
  critique: "text-red-700 bg-red-100 font-black",
};

interface Props {
  horseId: string;
  horseName: string;
  initialAlerts: HorseAlert[];
}

export default function AlerteCheval({ horseId, horseName, initialAlerts }: Props) {
  const [alerts, setAlerts] = useState<HorseAlert[]>(initialAlerts);
  const [showForm, setShowForm] = useState(false);
  const [showList, setShowList] = useState(false);
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState<AlertUrgency>("normal");
  const [submitting, setSubmitting] = useState(false);
  const supabase = createClient();

  const activeAlerts = alerts.filter((a) => !a.resolved);

  const submit = async () => {
    if (!description.trim()) return;
    setSubmitting(true);
    const { data, error } = await supabase
      .from("horse_alerts")
      .insert({ horse_id: horseId, description: description.trim(), urgency })
      .select()
      .single();
    if (!error && data) {
      setAlerts((prev) => [data as HorseAlert, ...prev]);
      setDescription("");
      setUrgency("normal");
      setShowForm(false);
      toast.success("Signalement envoyé");
    } else {
      toast.error("Erreur lors du signalement");
    }
    setSubmitting(false);
  };

  const resolve = async (id: string) => {
    await supabase.from("horse_alerts").update({ resolved: true }).eq("id", id);
    setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, resolved: true } : a));
    toast.success("Signalement résolu");
  };

  return (
    <div>
      {/* Active alerts display */}
      {activeAlerts.length > 0 && (
        <div className="space-y-1.5 mb-2">
          {activeAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`flex items-start gap-2 rounded-lg px-3 py-2 text-xs ${URGENCY_STYLES[alert.urgency as AlertUrgency]}`}
            >
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
              <span className="flex-1 leading-relaxed">{alert.description}</span>
              <button
                onClick={() => resolve(alert.id)}
                className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
                title="Marquer comme résolu"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-gray-50 rounded-xl p-3 space-y-2 mb-2">
          <textarea
            autoFocus
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={`Décrire le problème pour ${horseName}...`}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange resize-none bg-white"
            rows={2}
          />
          <div className="flex gap-2">
            <select
              value={urgency}
              onChange={(e) => setUrgency(e.target.value as AlertUrgency)}
              className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange bg-white"
            >
              {(Object.keys(URGENCY_LABELS) as AlertUrgency[]).map((u) => (
                <option key={u} value={u}>{URGENCY_LABELS[u]}</option>
              ))}
            </select>
            <button
              onClick={submit}
              disabled={submitting || !description.trim()}
              className="flex-1 btn-primary py-1.5 text-sm disabled:opacity-50"
            >
              Signaler
            </button>
            <button onClick={() => setShowForm(false)} className="px-3 text-sm text-gray-400 hover:text-black">
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => { setShowForm(!showForm); setShowList(false); }}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-orange transition-colors"
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          Signaler un problème
        </button>
        {alerts.filter((a) => a.resolved).length > 0 && (
          <button
            onClick={() => setShowList(!showList)}
            className="flex items-center gap-1 text-xs text-gray-300 hover:text-gray-500 transition-colors"
          >
            <ChevronDown className={`h-3 w-3 transition-transform ${showList ? "rotate-180" : ""}`} />
            Historique
          </button>
        )}
      </div>

      {/* Resolved history */}
      {showList && (
        <div className="mt-2 space-y-1">
          {alerts.filter((a) => a.resolved).map((alert) => (
            <div key={alert.id} className="text-xs text-gray-400 line-through px-3 py-1">
              {alert.description}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
