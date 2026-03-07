"use client";

import Modal from "@/components/ui/Modal";
import HealthEventForm from "./HealthEventForm";
import type { HealthRecord } from "@/lib/supabase/types";

interface Props {
  record: HealthRecord;
  onClose: () => void;
  onSaved: () => void;
}

export default function EditHealthEventModal({ record, onClose, onSaved }: Props) {
  return (
    <Modal open={true} onClose={onClose} title="Modifier le soin">
      <HealthEventForm
        horseId={record.horse_id}
        defaultValues={record}
        onSaved={onSaved}
        onCancel={onClose}
      />
    </Modal>
  );
}
