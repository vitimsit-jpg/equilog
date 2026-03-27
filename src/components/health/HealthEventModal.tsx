"use client";

import Modal from "@/components/ui/Modal";
import HealthEventForm from "./HealthEventForm";
import type { HealthRecord, HealthType, HorseIndexMode } from "@/lib/supabase/types";

interface Props {
  horseId: string;
  defaultType?: HealthType;
  defaultValues?: Partial<HealthRecord>;
  onClose: () => void;
  onSaved: () => void;
  horseMode?: HorseIndexMode | null;
}

export default function HealthEventModal({ horseId, defaultType, defaultValues, onClose, onSaved, horseMode }: Props) {
  const isEdit = !!defaultValues?.id;
  return (
    <Modal open={true} onClose={onClose} title={isEdit ? "Modifier le soin" : "Nouveau soin"} size="md">
      <HealthEventForm
        horseId={horseId}
        defaultValues={defaultValues ?? (defaultType ? { type: defaultType } : undefined)}
        onSaved={onSaved}
        onCancel={onClose}
        horseMode={horseMode}
      />
    </Modal>
  );
}
