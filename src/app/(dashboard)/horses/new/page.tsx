"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { DISCIPLINE_LABELS } from "@/lib/utils";

const disciplineOptions = Object.entries(DISCIPLINE_LABELS).map(([value, label]) => ({ value, label }));

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 35 }, (_, i) => {
  const y = currentYear - i;
  return { value: String(y), label: String(y) };
});

export default function NewHorsePage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    breed: "",
    birth_year: "",
    discipline: "",
    region: "",
    ecurie: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Le nom est requis");
      return;
    }
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data, error } = await supabase
      .from("horses")
      .insert({
        user_id: user.id,
        name: form.name.trim(),
        breed: form.breed || null,
        birth_year: form.birth_year ? parseInt(form.birth_year) : null,
        discipline: (form.discipline as any) || null,
        region: form.region || null,
        ecurie: form.ecurie || null,
        share_horse_index: true,
      })
      .select()
      .single();

    if (error) {
      toast.error("Erreur lors de la création");
    } else {
      toast.success(`${form.name} ajouté !`);
      router.push(`/horses/${data.id}`);
      router.refresh();
    }
    setLoading(false);
  };

  return (
    <div className="max-w-lg mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard" className="btn-ghost">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-black">Nouveau cheval</h1>
          <p className="text-sm text-gray-400">Ajoutez un cheval à votre compte</p>
        </div>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Nom du cheval *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Jackson"
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Race"
              value={form.breed}
              onChange={(e) => setForm({ ...form, breed: e.target.value })}
              placeholder="Selle Français"
            />
            <Select
              label="Année de naissance"
              value={form.birth_year}
              onChange={(e) => setForm({ ...form, birth_year: e.target.value })}
              options={yearOptions}
              placeholder="Sélectionner"
            />
          </div>

          <Select
            label="Discipline principale"
            value={form.discipline}
            onChange={(e) => setForm({ ...form, discipline: e.target.value })}
            options={disciplineOptions}
            placeholder="Sélectionner"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Région"
              value={form.region}
              onChange={(e) => setForm({ ...form, region: e.target.value })}
              placeholder="Île-de-France"
            />
            <Input
              label="Écurie"
              value={form.ecurie}
              onChange={(e) => setForm({ ...form, ecurie: e.target.value })}
              placeholder="Écurie du Val"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Link href="/dashboard" className="btn-secondary flex-1 text-center">
              Annuler
            </Link>
            <Button type="submit" loading={loading} className="flex-1">
              Créer le profil
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
