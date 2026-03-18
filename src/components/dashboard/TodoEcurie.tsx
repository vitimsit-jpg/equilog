"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CheckSquare, Square, Plus, X, ChevronDown } from "lucide-react";
import toast from "react-hot-toast";
import type { EcurieTodo, TodoFrequency } from "@/lib/supabase/types";

const FREQ_LABELS: Record<TodoFrequency, string> = {
  quotidien: "Quotidien",
  hebdo: "Hebdo",
  mensuel: "Mensuel",
  ponctuel: "Ponctuel",
};

const FREQ_OPTIONS: TodoFrequency[] = ["quotidien", "hebdo", "mensuel", "ponctuel"];

interface Props {
  initialTodos: EcurieTodo[];
}

export default function TodoEcurie({ initialTodos }: Props) {
  const [todos, setTodos] = useState<EcurieTodo[]>(initialTodos);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newFreq, setNewFreq] = useState<TodoFrequency>("quotidien");
  const [newAssigned, setNewAssigned] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const supabase = createClient();

  const pending = todos.filter((t) => t.status !== "fait");
  const done = todos.filter((t) => t.status === "fait");

  const toggleStatus = async (todo: EcurieTodo) => {
    const nextStatus = todo.status === "fait" ? "a_faire" : "fait";
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("ecurie_todos")
      .update({ status: nextStatus, last_done_at: nextStatus === "fait" ? now : todo.last_done_at })
      .eq("id", todo.id);
    if (!error) {
      setTodos((prev) =>
        prev.map((t) => t.id === todo.id ? { ...t, status: nextStatus } : t)
      );
    }
  };

  const deleteTodo = async (id: string) => {
    await supabase.from("ecurie_todos").delete().eq("id", id);
    setTodos((prev) => prev.filter((t) => t.id !== id));
  };

  const addTodo = async () => {
    if (!newTitle.trim()) return;
    const { data, error } = await supabase
      .from("ecurie_todos")
      .insert({ title: newTitle.trim(), frequency: newFreq, assigned_to_name: newAssigned || null })
      .select()
      .single();
    if (!error && data) {
      setTodos((prev) => [data as EcurieTodo, ...prev]);
      setNewTitle("");
      setNewFreq("quotidien");
      setNewAssigned("");
      setShowAdd(false);
      toast.success("Tâche ajoutée");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-2 group"
        >
          <h2 className="font-bold text-black group-hover:text-orange transition-colors">To-do écurie</h2>
          {pending.length > 0 && (
            <span className="text-xs font-bold text-white bg-orange rounded-full px-1.5 py-0.5 leading-none">
              {pending.length}
            </span>
          )}
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${collapsed ? "" : "rotate-180"}`} />
        </button>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="text-xs text-gray-400 hover:text-orange transition-colors font-medium flex items-center gap-1"
        >
          <Plus className="h-3.5 w-3.5" />
          Ajouter
        </button>
      </div>

      {showAdd && (
        <div className="card p-4 mb-3 space-y-3">
          <input
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTodo()}
            placeholder="Ex: Faire les boxes, Contrôler les clôtures..."
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange"
          />
          <div className="flex gap-2">
            <select
              value={newFreq}
              onChange={(e) => setNewFreq(e.target.value as TodoFrequency)}
              className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange bg-white"
            >
              {FREQ_OPTIONS.map((f) => (
                <option key={f} value={f}>{FREQ_LABELS[f]}</option>
              ))}
            </select>
            <input
              value={newAssigned}
              onChange={(e) => setNewAssigned(e.target.value)}
              placeholder="Assigné à..."
              className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={addTodo} className="flex-1 btn-primary py-1.5 text-sm">Ajouter</button>
            <button onClick={() => setShowAdd(false)} className="px-3 text-sm text-gray-400 hover:text-black">Annuler</button>
          </div>
        </div>
      )}

      {!collapsed && (
        <div className="card divide-y divide-gray-50">
          {todos.length === 0 && (
            <div className="p-4 text-center text-xs text-gray-400">
              Aucune tâche. Ajoutez vos tâches récurrentes d&apos;écurie.
            </div>
          )}
          {pending.map((todo) => (
            <div key={todo.id} className="flex items-center gap-3 p-3 group">
              <button onClick={() => toggleStatus(todo)} className="flex-shrink-0 text-gray-300 hover:text-orange transition-colors">
                <Square className="h-4 w-4" />
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-black">{todo.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-400">{FREQ_LABELS[todo.frequency]}</span>
                  {todo.assigned_to_name && (
                    <span className="text-xs text-gray-400">· {todo.assigned_to_name}</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => deleteTodo(todo.id)}
                className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all flex-shrink-0"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {done.length > 0 && (
            <>
              <div className="px-3 py-1.5 bg-gray-50">
                <span className="text-xs text-gray-400 font-medium">{done.length} fait{done.length > 1 ? "s" : ""}</span>
              </div>
              {done.map((todo) => (
                <div key={todo.id} className="flex items-center gap-3 p-3 group opacity-50">
                  <button onClick={() => toggleStatus(todo)} className="flex-shrink-0 text-orange">
                    <CheckSquare className="h-4 w-4" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-500 line-through">{todo.title}</p>
                    <span className="text-xs text-gray-400">{FREQ_LABELS[todo.frequency]}</span>
                  </div>
                  <button
                    onClick={() => deleteTodo(todo.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all flex-shrink-0"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
