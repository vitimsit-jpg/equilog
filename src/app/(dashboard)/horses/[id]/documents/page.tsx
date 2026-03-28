import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { FileText, Image, FileIcon, FolderOpen, ExternalLink } from "lucide-react";
import { HEALTH_TYPE_LABELS, BUDGET_CATEGORY_LABELS, formatCurrency } from "@/lib/utils";
import { HISTORY_CATEGORY_CONFIG } from "@/components/historique/HistoriqueTimeline";

interface Props {
  params: { id: string };
}

interface DocItem {
  url: string;
  date: string;
  source: "sante" | "budget" | "historique";
  label: string;
  sublabel: string | null;
}

function getFileType(url: string): "image" | "pdf" | "other" {
  const lower = url.toLowerCase();
  if (/\.(jpg|jpeg|png|webp|gif|heic)/.test(lower)) return "image";
  if (/\.pdf/.test(lower)) return "pdf";
  return "other";
}

function getFileName(url: string): string {
  try {
    const parts = new URL(url).pathname.split("/");
    const raw = decodeURIComponent(parts[parts.length - 1]);
    // Strip the timestamp prefix (e.g. "1234567890_abc123.pdf" → just show "pdf")
    const ext = raw.split(".").pop()?.toUpperCase() ?? "FICHIER";
    return ext;
  } catch {
    return "FICHIER";
  }
}

function FileTypeIcon({ type }: { type: "image" | "pdf" | "other" }) {
  if (type === "image") return <Image className="h-5 w-5 text-blue-500" />;
  if (type === "pdf") return <FileText className="h-5 w-5 text-red-500" />;
  return <FileIcon className="h-5 w-5 text-gray-400" />;
}

export default async function DocumentsPage({ params }: Props) {
  const supabase = createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return notFound();

  const { data: horse } = await supabase
    .from("horses")
    .select("id, name")
    .eq("id", params.id)
    .eq("user_id", authUser.id)
    .single();
  if (!horse) return notFound();

  const [{ data: healthRecords }, { data: budgetEntries }, { data: historyEvents }] = await Promise.all([
    supabase
      .from("health_records")
      .select("date, type, vet_name, media_urls")
      .eq("horse_id", horse.id)
      .not("media_urls", "is", null)
      .order("date", { ascending: false }),
    supabase
      .from("budget_entries")
      .select("date, category, amount, description, media_urls")
      .eq("horse_id", horse.id)
      .not("media_urls", "is", null)
      .order("date", { ascending: false }),
    supabase
      .from("horse_history_events")
      .select("event_date, event_year, event_month, category, title, media_urls")
      .eq("horse_id", horse.id)
      .not("media_urls", "is", null),
  ]);

  // Flatten into a unified list
  const docs: DocItem[] = [];

  for (const r of healthRecords || []) {
    if (!r.media_urls?.length) continue;
    for (const url of r.media_urls) {
      docs.push({
        url,
        date: r.date,
        source: "sante",
        label: HEALTH_TYPE_LABELS[r.type] ?? r.type,
        sublabel: r.vet_name || null,
      });
    }
  }

  for (const e of budgetEntries || []) {
    if (!e.media_urls?.length) continue;
    for (const url of e.media_urls) {
      docs.push({
        url,
        date: e.date,
        source: "budget",
        label: BUDGET_CATEGORY_LABELS[e.category] ?? e.category,
        sublabel: e.description
          ? `${formatCurrency(e.amount)} · ${e.description}`
          : formatCurrency(e.amount),
      });
    }
  }

  for (const ev of historyEvents || []) {
    if (!ev.media_urls?.length) continue;
    // Derive a sortable date string from event
    const dateStr = ev.event_date
      ?? (ev.event_year && ev.event_month ? `${ev.event_year}-${String(ev.event_month).padStart(2, "0")}-01` : null)
      ?? (ev.event_year ? `${ev.event_year}-01-01` : "1900-01-01");
    for (const url of ev.media_urls) {
      docs.push({
        url,
        date: dateStr,
        source: "historique",
        label: ev.title ?? (HISTORY_CATEGORY_CONFIG[ev.category as import("@/lib/supabase/types").HistoryCategory]?.label ?? ev.category),
        sublabel: null,
      });
    }
  }

  // Sort by date desc
  docs.sort((a, b) => b.date.localeCompare(a.date));

  // Group by month
  const byMonth: Record<string, DocItem[]> = {};
  for (const doc of docs) {
    const key = doc.date.slice(0, 7); // "yyyy-MM"
    if (!byMonth[key]) byMonth[key] = [];
    byMonth[key].push(doc);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-black">Documents</h2>
        <span className="text-xs text-gray-400">{docs.length} fichier{docs.length !== 1 ? "s" : ""}</span>
      </div>

      {docs.length === 0 ? (
        <div className="card flex flex-col items-center py-12 text-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
            <FolderOpen className="h-7 w-7 text-gray-300" />
          </div>
          <p className="font-semibold text-black text-sm">Aucun document</p>
          <p className="text-xs text-gray-400 max-w-xs leading-relaxed">
            Les fichiers ajoutés depuis les onglets Santé et Budget apparaîtront ici.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(byMonth).map(([monthKey, items]) => {
            const monthLabel = format(parseISO(`${monthKey}-01`), "MMMM yyyy", { locale: fr });
            return (
              <div key={monthKey}>
                <p className="text-2xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-0.5 capitalize">
                  {monthLabel}
                </p>
                <div className="card divide-y divide-gray-50 p-0 overflow-hidden">
                  {items.map((doc, i) => {
                    const fileType = getFileType(doc.url);
                    const ext = getFileName(doc.url);
                    const dateLabel = format(parseISO(doc.date), "d MMM", { locale: fr });

                    return (
                      <a
                        key={i}
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors group"
                      >
                        {/* File type icon */}
                        <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0 group-hover:bg-gray-200 transition-colors">
                          <FileTypeIcon type={fileType} />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-black">{doc.label}</span>
                            <span className={`text-2xs font-semibold px-1.5 py-0.5 rounded-full ${
                              doc.source === "sante"
                                ? "bg-red-50 text-red-600"
                                : doc.source === "budget"
                                ? "bg-orange-light text-orange"
                                : "bg-purple-50 text-purple-600"
                            }`}>
                              {doc.source === "sante" ? "Santé" : doc.source === "budget" ? "Budget" : "Historique"}
                            </span>
                            <span className="text-2xs text-gray-300 bg-gray-100 px-1.5 py-0.5 rounded font-mono">
                              {ext}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5 truncate">
                            {dateLabel}{doc.sublabel ? ` · ${doc.sublabel}` : ""}
                          </p>
                        </div>

                        {/* Open arrow */}
                        <ExternalLink className="h-3.5 w-3.5 text-gray-300 group-hover:text-gray-500 flex-shrink-0 transition-colors" />
                      </a>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
