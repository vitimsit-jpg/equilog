"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Download, Trash2, ShieldCheck, AlertTriangle } from "lucide-react";

interface Props {
  userId: string;
  optOutAnalytics: boolean;
}

export default function GDPRBlock({ userId, optOutAnalytics: initialOptOut }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [optOut, setOptOut] = useState(initialOptOut);
  const [savingOptOut, setSavingOptOut] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await fetch("/api/gdpr/export");
      if (!res.ok) throw new Error("Erreur lors de l'export");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `equilog-mes-donnees-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export téléchargé");
    } catch {
      toast.error("Erreur lors de l'export");
    }
    setDownloading(false);
  };

  const handleToggleOptOut = async (value: boolean) => {
    setSavingOptOut(true);
    setOptOut(value);
    const { error } = await supabase
      .from("users")
      .update({ opt_out_analytics: value })
      .eq("id", userId);
    if (error) {
      toast.error("Erreur lors de la mise à jour");
      setOptOut(!value);
    } else {
      toast.success(value ? "Vous ne contribuez plus aux statistiques anonymisées" : "Contribution aux statistiques réactivée");
    }
    setSavingOptOut(false);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "SUPPRIMER") return;
    setDeleting(true);
    try {
      const res = await fetch("/api/gdpr/delete-account", { method: "DELETE" });
      if (!res.ok) throw new Error("Erreur");
      await supabase.auth.signOut();
      router.push("/login?deleted=1");
    } catch {
      toast.error("Erreur lors de la suppression du compte");
      setDeleting(false);
    }
  };

  return (
    <div className="card space-y-0 p-0 overflow-hidden">
      <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-gray-50">
        <ShieldCheck className="h-4 w-4 text-gray-400" />
        <p className="text-2xs font-bold uppercase tracking-widest text-gray-400">Mes données & confidentialité</p>
      </div>

      {/* Télécharger mes données */}
      <button
        onClick={handleDownload}
        disabled={downloading}
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors border-b border-gray-50 group disabled:opacity-50"
      >
        <div className="text-left">
          <p className="text-sm font-semibold text-black">Télécharger mes données</p>
          <p className="text-xs text-gray-400 mt-0.5">Export complet en JSON — profil, chevaux, séances, soins, concours, budget</p>
        </div>
        <Download className="h-4 w-4 text-gray-300 group-hover:text-black flex-shrink-0 ml-3" />
      </button>

      {/* Toggle opt-out analytics */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-50">
        <div className="flex-1 pr-4">
          <p className="text-sm font-semibold text-black">Ne pas contribuer aux statistiques</p>
          <p className="text-xs text-gray-400 mt-0.5">Vos données n&apos;alimenteront pas les statistiques anonymisées d&apos;Equistra (Art. 21 RGPD)</p>
        </div>
        <button
          onClick={() => handleToggleOptOut(!optOut)}
          disabled={savingOptOut}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
            optOut ? "bg-orange" : "bg-gray-200"
          } disabled:opacity-50`}
          role="switch"
          aria-checked={optOut}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              optOut ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {/* Supprimer mon compte */}
      <button
        onClick={() => setShowDeleteModal(true)}
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-red-50 transition-colors group"
      >
        <div className="text-left">
          <p className="text-sm font-semibold text-danger">Supprimer mon compte</p>
          <p className="text-xs text-gray-400 mt-0.5">Supprime toutes vos données. Irréversible. Les données financières sont conservées 10 ans (obligation légale).</p>
        </div>
        <Trash2 className="h-4 w-4 text-danger/40 group-hover:text-danger flex-shrink-0 ml-3" />
      </button>

      {/* Modal suppression */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-danger" />
              </div>
              <div>
                <p className="font-bold text-black">Supprimer votre compte ?</p>
                <p className="text-xs text-gray-400 mt-0.5">Cette action est définitive et irréversible.</p>
              </div>
            </div>

            <div className="bg-red-50 rounded-xl p-3 space-y-1 text-xs text-gray-600">
              <p className="font-semibold text-danger">Sera supprimé :</p>
              <p>• Profil, chevaux, séances, soins, concours, nutrition</p>
              <p className="font-semibold text-gray-500 mt-2">Sera conservé (obligation légale) :</p>
              <p>• Données financières anonymisées (10 ans, Art. 6.1.c RGPD)</p>
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-2">
                Tapez <span className="font-bold text-black">SUPPRIMER</span> pour confirmer
              </p>
              <input
                type="text"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder="SUPPRIMER"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-danger"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteConfirm(""); }}
                className="flex-1 btn-secondary text-sm"
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirm !== "SUPPRIMER" || deleting}
                className="flex-1 bg-danger text-white font-bold text-sm py-2.5 rounded-xl disabled:opacity-40 transition-opacity"
              >
                {deleting ? "Suppression..." : "Supprimer définitivement"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
