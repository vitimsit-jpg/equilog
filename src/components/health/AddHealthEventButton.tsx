"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import Button from "@/components/ui/Button";
import HealthEventForm from "./HealthEventForm";
import Modal from "@/components/ui/Modal";
import { useRouter } from "next/navigation";

export default function AddHealthEventButton({ horseId }: { horseId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Ajouter un soin
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Nouveau soin" size="md">
        <HealthEventForm
          horseId={horseId}
          onSaved={() => {
            setOpen(false);
            router.refresh();
          }}
          onCancel={() => setOpen(false)}
        />
      </Modal>
    </>
  );
}
