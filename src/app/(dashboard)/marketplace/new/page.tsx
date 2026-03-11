import CreateListingForm from "@/components/marketplace/CreateListingForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NewListingPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/marketplace" className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="h-4 w-4 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-xl font-black text-black">Publier une annonce</h1>
          <p className="text-sm text-gray-500">Visible par toute la communauté Equistra</p>
        </div>
      </div>
      <CreateListingForm />
    </div>
  );
}
