import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, Phone, Tag, Calendar } from "lucide-react";
import type { Listing } from "@/lib/supabase/types";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import MarkAsSoldButton from "@/components/marketplace/MarkAsSoldButton";

const CATEGORY_LABELS: Record<string, string> = { cheval: "Cheval", materiel: "Matériel", service: "Service" };
const CONDITION_LABELS: Record<string, string> = { neuf: "Neuf", bon_etat: "Bon état", usage: "Usagé" };
const CATEGORY_COLORS: Record<string, string> = {
  cheval: "bg-blue-100 text-blue-700",
  materiel: "bg-purple-100 text-purple-700",
  service: "bg-green-100 text-green-700",
};

interface Props {
  params: { id: string };
}

export default async function ListingDetailPage({ params }: Props) {
  const supabase = createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  const { data: listing } = await supabase
    .from("listings")
    .select("*, users(name)")
    .eq("id", params.id)
    .single();

  if (!listing) return notFound();

  const l = listing as Listing;
  const isOwner = authUser?.id === l.user_id;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back */}
      <div className="flex items-center gap-3">
        <Link href="/marketplace" className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="h-4 w-4 text-gray-500" />
        </Link>
        <span className="text-sm text-gray-500">Marketplace</span>
      </div>

      {/* Image */}
      {l.image_url ? (
        <div className="w-full h-64 rounded-2xl overflow-hidden bg-gray-100">
          <img src={l.image_url} alt={l.title} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="w-full h-40 rounded-2xl bg-gray-100 flex items-center justify-center">
          <Tag className="h-10 w-10 text-gray-300" />
        </div>
      )}

      {/* Main info */}
      <div className="card space-y-4">
        {/* Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${CATEGORY_COLORS[l.category]}`}>
            {CATEGORY_LABELS[l.category]}
          </span>
          {l.subcategory && <span className="text-xs text-gray-500 font-medium">{l.subcategory}</span>}
          {l.condition && <span className="text-xs text-gray-500">· {CONDITION_LABELS[l.condition]}</span>}
        </div>

        {/* Title + Price */}
        <div>
          <h1 className="text-xl font-black text-black leading-snug">{l.title}</h1>
          <p className="text-2xl font-black text-black mt-2">
            {l.price != null ? (
              <>
                {l.price.toLocaleString("fr-FR")} €
                {l.price_negotiable && <span className="text-sm font-normal text-gray-400 ml-2">· négociable</span>}
              </>
            ) : (
              <span className="text-lg font-semibold text-gray-500">Nous contacter</span>
            )}
          </p>
        </div>

        {/* Meta */}
        <div className="flex flex-wrap gap-4 text-sm text-gray-500">
          {l.location && (
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" /> {l.location}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            {format(new Date(l.created_at), "d MMMM yyyy", { locale: fr })}
          </span>
        </div>

        {/* Horse details */}
        {l.category === "cheval" && (l.breed || l.birth_year || l.sexe) && (
          <div className="grid grid-cols-3 gap-3 pt-2 border-t border-gray-100">
            {l.breed && (
              <div>
                <p className="text-2xs text-gray-400 uppercase font-semibold">Race</p>
                <p className="text-sm font-semibold text-black mt-0.5">{l.breed}</p>
              </div>
            )}
            {l.birth_year && (
              <div>
                <p className="text-2xs text-gray-400 uppercase font-semibold">Âge</p>
                <p className="text-sm font-semibold text-black mt-0.5">{new Date().getFullYear() - l.birth_year} ans</p>
              </div>
            )}
            {l.sexe && (
              <div>
                <p className="text-2xs text-gray-400 uppercase font-semibold">Sexe</p>
                <p className="text-sm font-semibold text-black mt-0.5 capitalize">{l.sexe}</p>
              </div>
            )}
          </div>
        )}

        {/* Description */}
        {l.description && (
          <div className="pt-2 border-t border-gray-100">
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{l.description}</p>
          </div>
        )}
      </div>

      {/* Seller + Contact */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Vendeur</p>
            <p className="font-semibold text-black mt-0.5">{l.users?.name || "Membre Equistra"}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-black text-sm">
            {(l.users?.name || "?")[0].toUpperCase()}
          </div>
        </div>

        {l.contact_phone && (
          <div className="flex gap-3">
            <a
              href={`tel:${l.contact_phone}`}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-black text-sm font-semibold hover:bg-black hover:text-white transition-all"
            >
              <Phone className="h-4 w-4" />
              Appeler
            </a>
            <a
              href={`https://wa.me/${l.contact_phone.replace(/\s/g, "").replace(/^0/, "33")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-green-500 text-white text-sm font-semibold hover:bg-green-600 transition-colors"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp
            </a>
          </div>
        )}
      </div>

      {/* Owner actions */}
      {isOwner && <MarkAsSoldButton listingId={l.id} status={l.status} />}
    </div>
  );
}
