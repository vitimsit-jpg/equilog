import Link from "next/link";
import { MapPin, Tag } from "lucide-react";
import type { Listing } from "@/lib/supabase/types";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

const CATEGORY_LABELS: Record<string, string> = {
  cheval: "Cheval",
  materiel: "Matériel",
  service: "Service",
};

const CATEGORY_COLORS: Record<string, string> = {
  cheval: "bg-blue-100 text-blue-700",
  materiel: "bg-purple-100 text-purple-700",
  service: "bg-green-100 text-green-700",
};

const CONDITION_LABELS: Record<string, string> = {
  neuf: "Neuf",
  bon_etat: "Bon état",
  usage: "Usagé",
};

interface Props {
  listing: Listing;
}

export default function ListingCard({ listing }: Props) {
  return (
    <Link href={`/marketplace/${listing.id}`} className="card card-hover flex flex-col gap-3 group">
      {/* Image */}
      <div className="w-full h-40 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
        {(listing.images?.[0] || listing.image_url) ? (
          <img
            src={listing.images?.[0] || listing.image_url!}
            alt={listing.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Tag className="h-8 w-8 text-gray-300" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col gap-1.5 flex-1">
        {/* Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-2xs font-semibold px-2 py-0.5 rounded-full ${CATEGORY_COLORS[listing.category]}`}>
            {CATEGORY_LABELS[listing.category]}
          </span>
          {listing.subcategory && (
            <span className="text-2xs font-medium text-gray-400">{listing.subcategory}</span>
          )}
          {listing.condition && (
            <span className="text-2xs font-medium text-gray-400">• {CONDITION_LABELS[listing.condition]}</span>
          )}
        </div>

        {/* Title */}
        <p className="font-semibold text-black text-sm leading-snug line-clamp-2">{listing.title}</p>

        {/* Price */}
        <p className="font-black text-black text-base mt-auto">
          {listing.price != null ? (
            <>
              {listing.price.toLocaleString("fr-FR")} €
              {listing.price_negotiable && (
                <span className="text-xs font-normal text-gray-400 ml-1">· négociable</span>
              )}
            </>
          ) : (
            <span className="text-sm font-semibold text-gray-500">Nous contacter</span>
          )}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-gray-400 mt-1">
          {listing.location ? (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {listing.location}
            </span>
          ) : <span />}
          <span>{formatDistanceToNow(new Date(listing.created_at), { addSuffix: true, locale: fr })}</span>
        </div>
      </div>
    </Link>
  );
}
