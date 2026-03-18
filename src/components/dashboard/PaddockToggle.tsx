"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";

interface Props {
  horseId: string;
  initialChecked: boolean;
}

export default function PaddockToggle({ horseId, initialChecked }: Props) {
  const [checked, setChecked] = useState(initialChecked);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    if (loading) return;
    const newVal = !checked;
    setChecked(newVal); // optimistic
    setLoading(true);
    const supabase = createClient();
    const today = format(new Date(), "yyyy-MM-dd");
    await supabase
      .from("horse_daily_logs")
      .upsert(
        { horse_id: horseId, date: today, paddock_checked: newVal },
        { onConflict: "horse_id,date" }
      );
    setLoading(false);
  };

  return (
    <button
      onClick={toggle}
      className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-all ${
        checked
          ? "bg-green-50 text-green-700 border-green-200"
          : "bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300"
      }`}
    >
      <span
        className={`w-2 h-2 rounded-full transition-colors ${
          checked ? "bg-green-500" : "bg-gray-300"
        }`}
      />
      {checked ? "Paddock ✓" : "Paddock"}
    </button>
  );
}
