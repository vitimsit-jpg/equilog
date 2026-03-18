"use client";

import { useState } from "react";
import { MessageSquare, Send, X } from "lucide-react";
import toast from "react-hot-toast";

interface Props {
  horseId: string;
  horseName: string;
  ownerEmail: string;
  ownerName: string | null;
}

export default function NotifierProprietaire({ horseId, horseName, ownerEmail, ownerName }: Props) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!message.trim()) return;
    setSending(true);
    const res = await fetch("/api/notify-owner", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ horseId, message, ownerName }),
    });
    if (res.ok) {
      toast.success(`Propriétaire de ${horseName} notifié`);
      setMessage("");
      setOpen(false);
    } else {
      toast.error("Erreur lors de l'envoi");
    }
    setSending(false);
  };

  return (
    <div>
      {open && (
        <div className="bg-gray-50 rounded-xl p-3 space-y-2 mb-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-gray-600">
              Notifier {ownerName || "le propriétaire"} <span className="text-gray-400">({ownerEmail})</span>
            </p>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-black">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <textarea
            autoFocus
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={`Ex: ${horseName} a reçu ses soins aujourd'hui, tout s'est bien passé...`}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange resize-none bg-white"
            rows={3}
          />
          <div className="flex gap-2">
            <button
              onClick={send}
              disabled={sending || !message.trim()}
              className="flex-1 btn-primary py-1.5 text-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              {sending ? "Envoi…" : "Envoyer"}
            </button>
          </div>
        </div>
      )}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-orange transition-colors"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          Notifier le propriétaire
        </button>
      )}
    </div>
  );
}
