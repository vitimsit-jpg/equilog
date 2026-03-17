import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, TrendingUp, TrendingDown, Lightbulb, Play, FileText } from "lucide-react";

interface Props {
  params: { token: string };
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
          strokeDasharray={`${dash} ${gap + circ * 0.25}`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black text-black leading-none">{score}</span>
        <span className="text-xs text-gray-400 font-medium">/10</span>
      </div>
    </div>
  );
}

export default async function ShareAnalysePage({ params }: Props) {
  const admin = createAdminClient();

  const { data: analysis } = await admin
    .from("video_analyses")
    .select("*, horses(name)")
    .eq("share_token", params.token)
    .single();

  if (!analysis || !analysis.share_token) return notFound();

  const horseName = (analysis.horses as { name: string } | null)?.name ?? "Cheval";
  const date = new Date(analysis.created_at).toLocaleDateString("fr-FR", {
    day: "numeric", month: "long", year: "numeric",
  });

  // Generate signed URL if video stored
  let videoUrl: string | null = null;
  if (analysis.video_url) {
    const { data: signed } = await admin.storage
      .from("video-analyses")
      .createSignedUrl(analysis.video_url, 3600);
    videoUrl = signed?.signedUrl ?? null;
  }

  const scoreColor = analysis.score >= 8 ? "text-green-500" : analysis.score >= 6 ? "text-orange" : "text-red-500";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-black flex items-center justify-center">
            <span className="text-white font-black text-sm">E</span>
          </div>
          <span className="font-black text-black text-lg tracking-tight">EQUISTRA</span>
        </div>
        <Link href="/register" className="text-xs font-bold px-3 py-1.5 rounded-xl bg-black text-white hover:bg-gray-800 transition-colors">
          Créer un compte
        </Link>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">
        {/* Header */}
        <div>
          <p className="text-xs font-semibold text-orange uppercase tracking-wide mb-1">Analyse partagée</p>
          <h1 className="text-xl font-black text-black">
            {analysis.title || <span className="capitalize">{analysis.allure}</span>}
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">{horseName} · {date}</p>
        </div>

        {/* Score card */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-6">
          <ScoreGauge score={analysis.score} />
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Note globale</p>
            <p className={`text-3xl font-black mt-0.5 ${scoreColor}`}>{analysis.score}/10</p>
            <span className="inline-block mt-1 px-2 py-0.5 bg-gray-100 rounded-full text-xs font-semibold text-gray-600 capitalize">
              {analysis.allure}
            </span>
          </div>
        </div>

        {/* Video */}
        {videoUrl && (
          <a href={videoUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 p-4 hover:border-gray-300 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center flex-shrink-0">
              <Play className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-black">Voir la vidéo</p>
              <p className="text-xs text-gray-400">Lien valable 1 heure</p>
            </div>
          </a>
        )}

        {/* Posture */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Posture du cheval</p>
          <p className="text-sm text-gray-700 leading-relaxed">{analysis.posture_cheval}</p>
        </div>

        {/* Position cavalier */}
        {analysis.position_cavalier && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Position du cavalier</p>
            <p className="text-sm text-gray-700 leading-relaxed">{analysis.position_cavalier}</p>
          </div>
        )}

        {/* Points forts / À améliorer */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <p className="text-xs font-semibold text-gray-700">Points forts</p>
            </div>
            <ul className="space-y-2">
              {(analysis.points_forts as string[]).map((p, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-orange" />
              <p className="text-xs font-semibold text-gray-700">À améliorer</p>
            </div>
            <ul className="space-y-2">
              {(analysis.axes_amelioration as string[]).map((a, i) => (
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

        {/* Conseil */}
        <div className="bg-black rounded-2xl p-5 space-y-2">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-orange" />
            <p className="text-xs font-semibold text-orange uppercase tracking-wide">Conseil prioritaire</p>
          </div>
          <p className="text-sm text-white leading-relaxed">{analysis.conseil_principal}</p>
        </div>

        {/* Notes */}
        {analysis.notes && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-gray-400" />
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Notes de séance</p>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{analysis.notes}</p>
          </div>
        )}

        {/* CTA */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center space-y-3">
          <p className="text-sm font-bold text-black">Vous souhaitez suivre vos progrès ?</p>
          <p className="text-xs text-gray-500">Créez votre compte Equistra et accédez à l&apos;analyse vidéo IA, au suivi santé et au Horse Index.</p>
          <Link href="/register" className="inline-block px-6 py-2.5 rounded-xl bg-black text-white text-sm font-bold hover:bg-gray-800 transition-colors">
            Créer un compte gratuit →
          </Link>
        </div>
      </div>
    </div>
  );
}
