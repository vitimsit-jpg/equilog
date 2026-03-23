"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { MODULES_OPTIONNELS, DEFAULT_MODULES, getModules, type ModuleKey } from "@/lib/modules";

interface Props {
  userId: string;
  userModules: Record<string, boolean> | null;
}

export default function ModulesPersonnalisation({ userId, userModules }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [modules, setModules] = useState<Record<ModuleKey, boolean>>(getModules(userModules));
  const [saving, setSaving] = useState(false);

  const toggle = (key: ModuleKey) => {
    setModules((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("users").update({ user_modules: modules }).eq("id", userId);
    if (error) {
      toast.error("Erreur lors de la sauvegarde");
    } else {
      toast.success("Préférences sauvegardées");
      router.refresh();
    }
    setSaving(false);
  };

  const handleReset = async () => {
    setModules({ ...DEFAULT_MODULES });
    setSaving(true);
    await supabase.from("users").update({ user_modules: DEFAULT_MODULES }).eq("id", userId);
    setSaving(false);
    toast.success("Préférences réinitialisées");
    router.refresh();
  };

  return (
    <div className="card">
      <h2 className="font-bold text-black text-sm mb-1">Personnaliser mon app</h2>
      <p className="text-xs text-gray-400 mb-4">Activez ou désactivez les modules selon vos besoins.</p>

      <div className="space-y-3 mb-5">
        {MODULES_OPTIONNELS.map((mod) => {
          const active = modules[mod.key];
          return (
            <div key={mod.key} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xl flex-shrink-0">{mod.emoji}</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-black">{mod.label}</p>
                  <p className="text-xs text-gray-400 leading-tight">{mod.description}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggle(mod.key)}
                className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 ${active ? "bg-black" : "bg-gray-200"}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${active ? "translate-x-5" : "translate-x-1"}`} />
              </button>
            </div>
          );
        })}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="btn-primary w-full mb-3"
      >
        {saving ? "Sauvegarde…" : "Enregistrer mes préférences"}
      </button>

      <button
        onClick={handleReset}
        disabled={saving}
        className="w-full text-xs text-gray-400 hover:text-black transition-colors py-1"
      >
        Réinitialiser mes préférences
      </button>

      <p className="text-xs text-gray-400 text-center mt-3 pt-3 border-t border-gray-100">
        Désactiver un module ne supprime pas vos données.
      </p>
    </div>
  );
}
