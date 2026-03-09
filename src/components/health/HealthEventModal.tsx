"use client";

import Modal from "@/components/ui/Modal";
import HealthEventForm from "./HealthEventForm";
import type { HealthRecord, HealthType } from "@/lib/supabase/types";

interface Props {
  horseId: string;
  defaultType?: HealthType;
  defaultValues?: Partial<HealthRecord>;
  onClose: () => void;
  onSaved: () => void;
}

export default function HealthEventModal({ horseId, defaultType, defaultValues, onClose, onSaved }: Props) {
  const isEdit = !!defaultValues?.id;
  return (
    <Modal open={true} onClose={onClose} title={isEdit ? "Modifier le soin" : "Nouveau soin"} size="md">
      <HealthEventForm
        horseId={horseId}
        defaultValues={defaultValues ?? (defaultType ? { type: defaultType } : undefined)}
        onSaved={onSaved}
        onCancel={onClose}
      />
    </Modal>
  );
}
