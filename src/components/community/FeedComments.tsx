"use client";

import { useState, useRef } from "react";
import { MessageCircle, Trash2, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

interface Comment {
  id: string;
  user_id: string;
  user_name: string;
  content: string;
  created_at: string;
}

interface Props {
  itemType: "session" | "competition";
  itemId: string;
  currentUserId: string;
  initialComments: Comment[];
}

export default function FeedComments({ itemType, itemId, currentUserId, initialComments }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const count = comments.length;

  const handleToggle = () => {
    setExpanded((v) => !v);
    if (!expanded) setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || submitting) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_type: itemType, item_id: itemId, content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setComments((prev) => [...prev, data]);
      setContent("");
    } catch {
      toast.error("Erreur lors de l'envoi");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm("Supprimer ce commentaire ?")) return;
    try {
      const res = await fetch("/api/comments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment_id: commentId }),
      });
      if (!res.ok) throw new Error();
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  return (
    <div className="mt-1">
      {/* Toggle button */}
      <button
        onClick={handleToggle}
        className={cn(
          "flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border transition-all",
          expanded
            ? "border-gray-300 bg-gray-50 text-gray-600"
            : "border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600"
        )}
      >
        <MessageCircle className="h-3.5 w-3.5" />
        <span>
          {count > 0
            ? `${count} commentaire${count > 1 ? "s" : ""}`
            : "Commenter"}
        </span>
      </button>

      {/* Comment section */}
      {expanded && (
        <div className="mt-3 space-y-3">
          {/* Comment list */}
          {comments.length > 0 && (
            <div className="space-y-2">
              {comments.map((comment) => (
                <div key={comment.id} className="flex items-start gap-2 group">
                  <div className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                    {comment.user_name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="bg-gray-50 rounded-xl px-3 py-2">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className="text-xs font-semibold text-black truncate">
                          {comment.user_name}
                        </span>
                        {comment.user_id === currentUserId && (
                          <button
                            onClick={() => handleDelete(comment.id)}
                            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-50 text-gray-300 hover:text-danger transition-all flex-shrink-0"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-gray-700 leading-relaxed">{comment.content}</p>
                    </div>
                    <span className="text-2xs text-gray-400 ml-2">{formatDate(comment.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Écrire un commentaire…"
              maxLength={500}
              className="flex-1 text-xs border border-gray-200 rounded-full px-3 py-1.5 focus:outline-none focus:border-orange bg-white"
            />
            <button
              type="submit"
              disabled={!content.trim() || submitting}
              className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center disabled:opacity-30 hover:bg-gray-800 transition-colors flex-shrink-0"
            >
              {submitting
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Send className="h-3.5 w-3.5" />
              }
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
