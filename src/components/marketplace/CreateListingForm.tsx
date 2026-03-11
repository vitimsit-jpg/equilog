"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Upload, X, ImagePlus } from "lucide-react";
import toast from "react-hot-toast";

const MAX_IMAGES = 5;

const SUBCATEGORIES = {
  cheval: ["CSO", "Dressage", "CCE", "Endurance", "Loisir", "Poney", "Attelage", "Autre"],
  materiel: ["Selle", "Bride & filet", "Protections", "Tapis & couvertures", "Vêtements cavalier", "Soins & santé", "Autre"],
  service: ["Pension", "Cours particuliers", "Transport", "Maréchal-ferrant", "Ostéopathie", "Garde & pâturage", "Autre"],
};

const CATEGORY_OPTIONS = [
  { value: "cheval", label: "🐴 Cheval", desc: "Vente ou pension d'un cheval" },
  { value: "materiel", label: "🛒 Matériel", desc: "Équipements & sellerie" },
  { value: "service", label: "🤝 Service", desc: "Cours, pension, transport…" },
];

interface ImageEntry {
  file: File;
  preview: string;
}

export default function CreateListingForm() {
  const router = useRouter();
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<ImageEntry[]>([]);

  const [form, setForm] = useState({
    category: "cheval" as "cheval" | "materiel" | "service",
    title: "",
    description: "",
    price: "",
    price_negotiable: false,
    location: "",
    contact_phone: "",
    subcategory: "",
    condition: "" as "" | "neuf" | "bon_etat" | "usage",
    breed: "",
    birth_year: "",
    sexe: "" as "" | "hongre" | "jument" | "etalon",
  });

  const set = (k: keyof typeof form, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const newEntries: ImageEntry[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      if (images.length + newEntries.length >= MAX_IMAGES) break;
      newEntries.push({ file, preview: URL.createObjectURL(file) });
    }
    setImages((prev) => [...prev, ...newEntries]);
  };

  const removeImage = (idx: number) => {
    setImages((prev) => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non connecté");

      // Upload all images
      const uploadedUrls: string[] = [];
      for (const entry of images) {
        const ext = entry.file.name.split(".").pop();
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("marketplace")
          .upload(path, entry.file, { contentType: entry.file.type });
        if (!uploadErr) {
          const { data } = supabase.storage.from("marketplace").getPublicUrl(path);
          uploadedUrls.push(data.publicUrl);
        }
      }

      const { error } = await supabase.from("listings").insert({
        user_id: user.id,
        title: form.title.trim(),
        description: form.description.trim() || null,
        price: form.price ? parseInt(form.price) : null,
        price_negotiable: form.price_negotiable,
        category: form.category,
        subcategory: form.subcategory || null,
        condition: form.condition || null,
        image_url: uploadedUrls[0] || null,
        images: uploadedUrls,
        location: form.location.trim() || null,
        contact_phone: form.contact_phone.trim() || null,
        breed: form.breed.trim() || null,
        birth_year: form.birth_year ? parseInt(form.birth_year) : null,
        sexe: form.sexe || null,
        status: "active",
      });

      if (error) throw new Error(error.message || "Erreur base de données");
      toast.success("Annonce publiée !");
      router.push("/marketplace");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[marketplace]", msg);
      toast.error(msg || "Erreur lors de la publication");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-xl mx-auto space-y-6">
      {/* Category */}
      <div className="space-y-2">
        <label className="label">Catégorie *</label>
        <div className="grid grid-cols-3 gap-3">
          {CATEGORY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { set("category", opt.value); set("subcategory", ""); }}
              className={`flex flex-col items-start p-3 rounded-xl border-2 transition-all text-left ${
                form.category === opt.value
                  ? "border-black bg-black text-white"
                  : "border-gray-200 hover:border-gray-400"
              }`}
            >
              <span className="text-lg">{opt.label.split(" ")[0]}</span>
              <span className="text-xs font-semibold mt-1">{opt.label.split(" ").slice(1).join(" ")}</span>
              <span className={`text-2xs mt-0.5 ${form.category === opt.value ? "text-gray-300" : "text-gray-400"}`}>
                {opt.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Title */}
      <div className="space-y-1">
        <label className="label">Titre de l&apos;annonce *</label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder={form.category === "cheval" ? "Ex: Hongre SF 8 ans, CSO 110" : form.category === "materiel" ? "Ex: Selle CWD taille 17" : "Ex: Cours dressage région bordelaise"}
          required
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-black"
        />
      </div>

      {/* Description */}
      <div className="space-y-1">
        <label className="label">Description</label>
        <textarea
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          rows={4}
          placeholder="Décrivez votre annonce en détail…"
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-black resize-none"
        />
      </div>

      {/* Images */}
      <div className="space-y-2">
        <label className="label">
          Photos
          <span className="ml-1 font-normal text-gray-400">({images.length}/{MAX_IMAGES})</span>
        </label>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        <div className="grid grid-cols-3 gap-2">
          {images.map((img, idx) => (
            <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 group">
              <img src={img.preview} alt="" className="w-full h-full object-cover" />
              {idx === 0 && (
                <span className="absolute bottom-1 left-1 bg-black/60 text-white text-2xs px-1.5 py-0.5 rounded font-medium">
                  Principale
                </span>
              )}
              <button
                type="button"
                onClick={() => removeImage(idx)}
                className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}

          {images.length < MAX_IMAGES && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="aspect-square rounded-xl border-2 border-dashed border-gray-200 hover:border-orange transition-colors flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-orange"
            >
              <ImagePlus className="h-5 w-5" />
              <span className="text-2xs font-medium">Ajouter</span>
            </button>
          )}
        </div>

        {images.length === 0 && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full h-28 border-2 border-dashed border-gray-200 rounded-xl hover:border-orange transition-colors flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-orange"
          >
            <Upload className="h-6 w-6" />
            <span className="text-xs font-medium">Ajouter jusqu&apos;à {MAX_IMAGES} photos</span>
          </button>
        )}
      </div>

      {/* Price */}
      <div className="space-y-2">
        <label className="label">Prix</label>
        <div className="relative">
          <input
            type="number"
            value={form.price}
            onChange={(e) => set("price", e.target.value)}
            placeholder="Laisser vide = nous contacter"
            min={0}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-black pr-10"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.price_negotiable} onChange={(e) => set("price_negotiable", e.target.checked)} className="rounded" />
          <span className="text-sm text-gray-600">Prix négociable</span>
        </label>
      </div>

      {/* Subcategory */}
      <div className="space-y-1">
        <label className="label">Sous-catégorie</label>
        <select value={form.subcategory} onChange={(e) => set("subcategory", e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-black bg-white">
          <option value="">— Sélectionner —</option>
          {SUBCATEGORIES[form.category].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Condition (materiel only) */}
      {form.category === "materiel" && (
        <div className="space-y-1">
          <label className="label">État</label>
          <select value={form.condition} onChange={(e) => set("condition", e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-black bg-white">
            <option value="">— Sélectionner —</option>
            <option value="neuf">Neuf</option>
            <option value="bon_etat">Bon état</option>
            <option value="usage">Usagé</option>
          </select>
        </div>
      )}

      {/* Horse specific fields */}
      {form.category === "cheval" && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="label">Race</label>
            <input type="text" value={form.breed} onChange={(e) => set("breed", e.target.value)}
              placeholder="SF, PSH, Anglo…"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-black" />
          </div>
          <div className="space-y-1">
            <label className="label">Année de naissance</label>
            <input type="number" value={form.birth_year} onChange={(e) => set("birth_year", e.target.value)}
              placeholder="2018" min={1990} max={new Date().getFullYear()}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-black" />
          </div>
          <div className="space-y-1 col-span-2">
            <label className="label">Sexe</label>
            <div className="flex gap-3">
              {(["hongre", "jument", "etalon"] as const).map((s) => (
                <button key={s} type="button" onClick={() => set("sexe", form.sexe === s ? "" : s)}
                  className={`flex-1 py-2 rounded-xl border-2 text-sm font-medium transition-all capitalize ${
                    form.sexe === s ? "border-black bg-black text-white" : "border-gray-200 hover:border-gray-400"
                  }`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Location + Contact */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="label">Localisation</label>
          <input type="text" value={form.location} onChange={(e) => set("location", e.target.value)}
            placeholder="Paris, Lyon…"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-black" />
        </div>
        <div className="space-y-1">
          <label className="label">Téléphone</label>
          <input type="tel" value={form.contact_phone} onChange={(e) => set("contact_phone", e.target.value)}
            placeholder="06 XX XX XX XX"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-black" />
        </div>
      </div>

      {/* Submit */}
      <button type="submit" disabled={loading || !form.title.trim()}
        className="w-full btn-primary flex items-center justify-center gap-2 py-3.5">
        {loading ? (
          <><Loader2 className="h-4 w-4 animate-spin" />
          {images.length > 0 ? "Upload en cours…" : "Publication en cours…"}</>
        ) : "Publier l'annonce"}
      </button>
    </form>
  );
}
