"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Sparkles, X, MessageSquare } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS: Record<string, string[]> = {
  default: [
    "Mon cheval est-il en surmenage ?",
    "Comment préparer la semaine prochaine ?",
    "Que penses-tu de sa récupération ?",
    "Quels sont ses points à améliorer ?",
    "Son Horse Index est-il normal pour sa discipline ?",
  ],
  after_competition: [
    "Comment récupérer après un concours ?",
    "Quelle charge cette semaine post-concours ?",
  ],
};

interface Props {
  horseId: string;
  horseName: string;
  hasRecentCompetition?: boolean;
}

export default function CoachChat({ horseId, horseName, hasRecentCompetition }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = hasRecentCompetition
    ? [...SUGGESTIONS.after_competition, ...SUGGESTIONS.default.slice(0, 3)]
    : SUGGESTIONS.default;

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  const send = async (text: string) => {
    if (!text.trim() || streaming) return;

    const userMsg: Message = { role: "user", content: text.trim() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setStreaming(true);

    // Placeholder assistant message
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/coach-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ horseId, messages: updatedMessages }),
      });

      if (!res.ok || !res.body) throw new Error("Erreur API");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        const final = accumulated;
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: final };
          return updated;
        });
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "Désolé, une erreur s'est produite. Réessayez.",
        };
        return updated;
      });
    } finally {
      setStreaming(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-black text-white px-4 py-3 rounded-2xl shadow-lg hover:bg-gray-900 transition-all hover:scale-105"
        >
          <Sparkles className="h-4 w-4 text-orange" />
          <span className="text-sm font-bold">Coach IA</span>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-24px)] flex flex-col rounded-2xl shadow-2xl border border-gray-100 overflow-hidden bg-white" style={{ height: "520px" }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-black">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-orange" />
              <div>
                <p className="text-sm font-bold text-white">Coach IA</p>
                <p className="text-2xs text-gray-400">{horseName}</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <div className="w-7 h-7 rounded-xl bg-orange flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Sparkles className="h-3.5 w-3.5 text-white" />
                  </div>
                  <div className="bg-gray-50 rounded-2xl rounded-tl-sm px-3 py-2.5 max-w-[280px]">
                    <p className="text-sm text-gray-700">
                      Bonjour ! Je suis votre coach IA pour <strong>{horseName}</strong>. J&apos;ai accès à toutes ses données — posez-moi n&apos;importe quelle question.
                    </p>
                  </div>
                </div>

                {/* Suggestions */}
                <div className="ml-9 space-y-1.5">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="block w-full text-left text-xs text-gray-600 bg-gray-50 hover:bg-orange-light hover:text-orange border border-gray-100 hover:border-orange/20 rounded-xl px-3 py-2 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex items-start gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-xl bg-orange flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Sparkles className="h-3.5 w-3.5 text-white" />
                  </div>
                )}
                <div
                  className={`rounded-2xl px-3 py-2.5 max-w-[280px] text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-black text-white rounded-tr-sm"
                      : "bg-gray-50 text-gray-800 rounded-tl-sm"
                  }`}
                >
                  {msg.content || (
                    <span className="flex gap-1 items-center py-0.5">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </span>
                  )}
                </div>
              </div>
            ))}

            {/* After first response, show reset suggestion */}
            {messages.length >= 2 && !streaming && (
              <div className="flex justify-center">
                <button
                  onClick={() => setMessages([])}
                  className="flex items-center gap-1.5 text-2xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <MessageSquare className="h-3 w-3" />
                  Nouvelle conversation
                </button>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-gray-100">
            <form
              onSubmit={(e) => { e.preventDefault(); send(input); }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Posez une question…"
                disabled={streaming}
                className="flex-1 text-sm bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 focus:outline-none focus:border-orange/40 focus:bg-white transition-colors placeholder:text-gray-300 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || streaming}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-black text-white disabled:opacity-30 hover:bg-gray-800 transition-colors flex-shrink-0"
              >
                {streaming
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Send className="h-4 w-4" />
                }
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
