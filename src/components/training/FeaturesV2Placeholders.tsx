"use client";

// TRAV-09/10/11/14 — Placeholder cards for upcoming native & AI features

import { useEffect, useState } from "react";
import { Smartphone, Activity, Video, Bell, Lock, BellRing } from "lucide-react";

interface Feature {
  key: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
}

const FEATURES: Feature[] = [
  {
    key: "gps",
    icon: <Smartphone className="h-5 w-5" />,
    title: "Tracking GPS",
    description: "Enregistrez vos parcours, distances et allures directement depuis l'application iOS.",
    badge: "iOS v2",
  },
  {
    key: "accelerometer",
    icon: <Activity className="h-5 w-5" />,
    title: "Analyse des allures",
    description: "Détection automatique du trot, galop et transitions via l'accéléromètre de votre iPhone.",
    badge: "iOS v2",
  },
  {
    key: "video_ia",
    icon: <Video className="h-5 w-5" />,
    title: "Analyse vidéo IA",
    description: "Filmez votre cheval et obtenez une analyse automatique de sa posture et de son équilibre.",
  },
  {
    key: "smart_notifications",
    icon: <Bell className="h-5 w-5" />,
    title: "Notifications intelligentes",
    description: "Rappels avant concours, alertes surcharge, relances inactivité et suggestions de récupération.",
  },
];

function PlaceholderCard({
  feature,
  interested,
  onToggle,
  loading,
}: {
  feature: Feature;
  interested: boolean;
  onToggle: () => void;
  loading: boolean;
}) {
  return (
    <div className="card opacity-70 relative overflow-hidden">
      {/* Badge top-right */}
      <div className="absolute top-3 right-3">
        {feature.badge ? (
          <span className="text-2xs font-bold text-orange bg-orange-light px-2 py-0.5 rounded-full">
            {feature.badge}
          </span>
        ) : (
          <span className="flex items-center gap-1 text-2xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            <Lock className="h-2.5 w-2.5" />
            Bientôt
          </span>
        )}
      </div>

      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0 text-gray-400">
          {feature.icon}
        </div>
        <div className="flex-1 min-w-0 pr-16">
          <p className="text-sm font-bold text-gray-600">{feature.title}</p>
          <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{feature.description}</p>
        </div>
      </div>

      {/* Notify button */}
      <button
        onClick={onToggle}
        disabled={loading}
        className={`mt-3 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
          interested
            ? "bg-orange-light text-orange"
            : "bg-gray-100 text-gray-400 hover:bg-gray-200"
        }`}
      >
        {interested ? (
          <>
            <BellRing className="h-3.5 w-3.5" />
            Notifié au lancement
          </>
        ) : (
          <>
            <Bell className="h-3.5 w-3.5" />
            Me notifier au lancement
          </>
        )}
      </button>
    </div>
  );
}

export default function FeaturesV2Placeholders() {
  const [interests, setInterests] = useState<Set<string>>(new Set());
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    fetch("/api/feature-interest")
      .then((r) => r.json())
      .then((data) => {
        if (data.interests) setInterests(new Set(data.interests));
        setFetched(true);
      })
      .catch(() => setFetched(true));
  }, []);

  async function toggle(key: string) {
    if (loadingKey) return;
    setLoadingKey(key);
    try {
      const res = await fetch("/api/feature-interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featureKey: key }),
      });
      const data = await res.json();
      setInterests((prev) => {
        const next = new Set(prev);
        if (data.registered) next.add(key);
        else next.delete(key);
        return next;
      });
    } finally {
      setLoadingKey(null);
    }
  }

  return (
    <div className="space-y-3 mt-2">
      <p className="text-2xs font-bold uppercase tracking-widest text-gray-300 px-1">
        Fonctionnalités à venir
      </p>

      {FEATURES.map((f) => (
        <PlaceholderCard
          key={f.key}
          feature={f}
          interested={fetched && interests.has(f.key)}
          onToggle={() => toggle(f.key)}
          loading={loadingKey === f.key}
        />
      ))}
    </div>
  );
}
