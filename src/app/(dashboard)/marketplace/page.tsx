import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Plus } from "lucide-react";
import ListingCard from "@/components/marketplace/ListingCard";
import type { Listing } from "@/lib/supabase/types";

const CATEGORIES = [
  { value: "", label: "Tout" },
  { value: "cheval", label: "Chevaux" },
  { value: "materiel", label: "Matériel" },
  { value: "service", label: "Services" },
];

interface Props {
  searchParams: { category?: string; q?: string };
}

export default async function MarketplacePage({ searchParams }: Props) {
  const supabase = createClient();
  const category = searchParams.category || "";
  const q = searchParams.q || "";

  let query = supabase
    .from("listings")
    .select("*, users(name)")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (category) query = query.eq("category", category);
  if (q) query = query.ilike("title", `%${q}%`);

  const { data: listings } = await query;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-black">Marketplace</h1>
          <p className="text-sm text-gray-500 mt-0.5">Chevaux, matériel et services équestres</p>
        </div>
        <Link href="/marketplace/new" className="btn-primary flex items-center gap-2 text-sm px-4 py-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Publier</span>
        </Link>
      </div>

      {/* Search + Category filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form className="flex-1" method="GET">
          {category && <input type="hidden" name="category" value={category} />}
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Rechercher une annonce…"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-black"
          />
        </form>
        <div className="flex gap-2">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.value}
              href={`/marketplace?category=${cat.value}${q ? `&q=${q}` : ""}`}
              className={`px-3 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                category === cat.value
                  ? "bg-black text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {cat.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Listings grid */}
      {!listings || listings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
            <span className="text-2xl">🛒</span>
          </div>
          <div>
            <p className="font-semibold text-black">Aucune annonce</p>
            <p className="text-sm text-gray-400 mt-1">
              {q || category ? "Essayez d'autres filtres" : "Soyez le premier à publier !"}
            </p>
          </div>
          <Link href="/marketplace/new" className="btn-primary text-sm px-4 py-2">
            Publier une annonce
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(listings as Listing[]).map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
}
