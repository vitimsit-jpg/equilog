"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import toast from "react-hot-toast";

interface Props {
  horseId: string;
  horseName: string;
}

export default function DeleteHorseButton({ horseId, horseName }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (confirmText !== horseName) {
      toast.error("Le nom saisi ne correspond pas");
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/horses/${horseId}`, { method: "DELETE" });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "Erreur" }));
        throw new Error(error || "Erreur lors de la suppression");
      }
      toast.success(`${horseName} a été supprimé`);
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
      setDeleting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
        title="Supprimer ce cheval"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-black">Supprimer {horseName} ?</h3>
            <p className="text-sm text-gray-600">
              Cette action est <strong>irréversible</strong>. Toutes les données liées
              (séances, soins, concours, scores, partages…) seront définitivement supprimées.
            </p>
            <p className="text-sm text-gray-700">
              Pour confirmer, tapez <strong>{horseName}</strong> :
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={horseName}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              autoFocus
            />
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => { setOpen(false); setConfirmText(""); }}
                className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting || confirmText !== horseName}
                className="flex-1 px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {deleting ? "Suppression…" : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
