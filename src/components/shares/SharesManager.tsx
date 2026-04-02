"use client";

import { useState } from "react";
import { UserPlus, Trash2, Clock, CheckCircle, XCircle, Shield, Dumbbell, Heart, Trophy, CalendarDays } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import type { HorseShare } from "@/lib/supabase/types";
import toast from "react-hot-toast";

interface ShareWithName extends HorseShare {
  shared_with_name: string | null;
}

interface SharesManagerProps {
  horseId: string;
  initialShares: ShareWithName[];
}

const ROLE_LABELS: Record<string, string> = {
  gerant: "Gérant d'écurie",
  coach: "Coach",
};

const STATUS_CONFIG = {
  pending: { label: "En attente", icon: Clock, color: "text-warning" },
  active: { label: "Actif", icon: CheckCircle, color: "text-success" },
  revoked: { label: "Révoqué", icon: XCircle, color: "text-danger" },
};

export default function SharesManager({ horseId, initialShares }: SharesManagerProps) {
  const [shares, setShares] = useState<ShareWithName[]>(initialShares);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"gerant" | "coach">("gerant");
  const [canSeeTraining, setCanSeeTraining] = useState(true);
  const [canSeeHealth, setCanSeeHealth] = useState(false);
  const [canSeeCompetitions, setCanSeeCompetitions] = useState(true);
  const [canSeePlanning, setCanSeePlanning] = useState(true);
  const [loading, setLoading] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  const handleInvite = async () => {
    if (!email) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/horses/${horseId}/shares`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          role,
          can_see_training: canSeeTraining,
          can_see_health: canSeeHealth,
          can_see_competitions: canSeeCompetitions,
          can_see_planning: canSeePlanning,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Erreur"); return; }

      toast.success(data.alreadyUser ? "Accès activé immédiatement." : "Invitation envoyée — l'accès sera activé à la prochaine connexion.");
      setShares((prev) => {
        const idx = prev.findIndex((s) => s.id === data.share.id);
        if (idx >= 0) { const updated = [...prev]; updated[idx] = { ...data.share, shared_with_name: null }; return updated; }
        return [{ ...data.share, shared_with_name: null }, ...prev];
      });
      setEmail("");
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (shareId: string, email: string) => {
    if (!window.confirm(`Révoquer l'accès de ${email} ? Cette action est immédiate.`)) return;
    setRevoking(shareId);
    try {
      const res = await fetch(`/api/horses/${horseId}/shares/${shareId}`, { method: "DELETE" });
      if (!res.ok) { toast.error("Erreur lors de la révocation"); return; }
      setShares((prev) => prev.filter((s) => s.id !== shareId));
      toast.success("Accès révoqué.");
    } finally {
      setRevoking(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Formulaire invitation */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-orange" />
          <h3 className="font-semibold text-black">Inviter un accès</h3>
        </div>

        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="coach@exemple.com"
        />

        <div>
          <label className="label">Rôle</label>
          <div className="flex gap-2 mt-1">
            {(["gerant", "coach"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium border transition-all ${
                  role === r
                    ? "bg-orange text-white border-orange"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                }`}
              >
                {ROLE_LABELS[r]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Données accessibles</label>
          <div className="mt-2 space-y-2">
            <PermissionRow
              icon={<Dumbbell className="h-4 w-4" />}
              label="Séances de travail"
              checked={canSeeTraining}
              onChange={setCanSeeTraining}
            />
            <PermissionRow
              icon={<Heart className="h-4 w-4" />}
              label="Soins & santé"
              checked={canSeeHealth}
              onChange={setCanSeeHealth}
            />
            <PermissionRow
              icon={<Trophy className="h-4 w-4" />}
              label="Concours"
              checked={canSeeCompetitions}
              onChange={setCanSeeCompetitions}
            />
            <PermissionRow
              icon={<CalendarDays className="h-4 w-4" />}
              label="Planning"
              checked={canSeePlanning}
              onChange={setCanSeePlanning}
            />
          </div>
        </div>

        <Button onClick={handleInvite} loading={loading} disabled={!email} className="w-full">
          Envoyer l&apos;invitation
        </Button>
      </div>

      {/* Liste accès existants */}
      {shares.length > 0 && (
        <div className="card space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-orange" />
            <h3 className="font-semibold text-black">Accès en cours ({shares.length})</h3>
          </div>
          {shares.map((share) => {
            const statusCfg = STATUS_CONFIG[share.status];
            const StatusIcon = statusCfg.icon;
            return (
              <div key={share.id} className="flex items-start justify-between gap-3 p-3 bg-beige rounded-xl">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-black truncate">
                      {share.shared_with_name || share.shared_with_email}
                    </span>
                    <span className="text-2xs bg-white border border-gray-200 text-gray-500 px-2 py-0.5 rounded-full">
                      {ROLE_LABELS[share.role]}
                    </span>
                    <span className={`flex items-center gap-1 text-2xs font-medium ${statusCfg.color}`}>
                      <StatusIcon className="h-3 w-3" />
                      {statusCfg.label}
                    </span>
                  </div>
                  <p className="text-2xs text-gray-400 mt-0.5">{share.shared_with_email}</p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {share.can_see_training && <DataBadge label="Travail" />}
                    {share.can_see_health && <DataBadge label="Santé" />}
                    {share.can_see_competitions && <DataBadge label="Concours" />}
                    {share.can_see_planning && <DataBadge label="Planning" />}
                  </div>
                </div>
                <button
                  onClick={() => handleRevoke(share.id, share.shared_with_email)}
                  disabled={revoking === share.id}
                  className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-danger hover:bg-red-50 transition-colors"
                  title="Révoquer l'accès"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {shares.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4">Aucun accès partagé pour ce cheval.</p>
      )}
    </div>
  );
}

function PermissionRow({ icon, label, checked, onChange }: {
  icon: React.ReactNode;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-full flex items-center gap-3 p-2.5 rounded-xl border transition-all text-left ${
        checked ? "bg-orange/5 border-orange/30" : "bg-white border-gray-200"
      }`}
    >
      <span className={checked ? "text-orange" : "text-gray-400"}>{icon}</span>
      <span className={`text-sm font-medium flex-1 ${checked ? "text-black" : "text-gray-500"}`}>{label}</span>
      <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
        checked ? "bg-orange border-orange" : "border-gray-300"
      }`}>
        {checked && <span className="text-white text-xs">✓</span>}
      </span>
    </button>
  );
}

function DataBadge({ label }: { label: string }) {
  return (
    <span className="text-2xs bg-white border border-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">
      {label}
    </span>
  );
}
