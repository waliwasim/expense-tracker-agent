"use client";

import { useEffect, useState, useRef } from "react";
import { Expense, Budgets, Category } from "@/lib/types";
import { loadExpenses, saveExpenses, loadBudgets, saveBudgets } from "@/lib/storage";
import { CATEGORIES } from "@/lib/categories";
import { Send, Wallet, AlertTriangle, TrendingUp } from "lucide-react";

export default function Home() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgets, setBudgets] = useState<Budgets>(loadBudgets());
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setExpenses(loadExpenses());
    setBudgets(loadBudgets());
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const thisMonthExpenses = expenses.filter((e) => {
    const d = new Date(e.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const totalSpent = thisMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const remainingOverall = budgets.overall - totalSpent;

  const categorySpent = (cat: Category) =>
    thisMonthExpenses.filter((e) => e.category === cat).reduce((s, e) => s + e.amount, 0);

  async function sendMessage() {
    if (!input.trim() || loading) return;

    const userMsg = { role: "user" as const, content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          expenses: thisMonthExpenses,
          budgets,
        }),
      });

      const data = await res.json();

      if (data.action === "add_expense") {
        const newExpense: Expense = {
          id: crypto.randomUUID(),
          amount: Number(data.amount),
          category: data.category,
          note: data.note || "",
          date: data.date || new Date().toISOString().split("T")[0],
        };
        const updated = [...expenses, newExpense];
        setExpenses(updated);
        saveExpenses(updated);

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Added Rs ${newExpense.amount.toLocaleString()} under ${newExpense.category}${newExpense.note ? ` (${newExpense.note})` : ""}.`,
          },
        ]);
      } else if (data.action === "set_budget") {
        const updated = { ...budgets };
        if (data.target === "overall") {
          updated.overall = Number(data.amount);
        } else {
          updated[data.target as Category] = Number(data.amount);
        }
        setBudgets(updated);
        saveBudgets(updated);

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Budget updated: ${data.target} set to Rs ${Number(data.amount).toLocaleString()}.`,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.message || "Done." },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Failed to process. Check your Groq API key." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col md:flex-row">
      {/* Sidebar - Stats & Budgets */}
      <div className="w-full md:w-80 border-r border-zinc-800 p-5 space-y-6 overflow-y-auto">
        <div className="flex items-center gap-2 text-xl font-semibold">
          <Wallet className="w-6 h-6 text-emerald-400" />
          Expense Agent
        </div>

        <div className="bg-zinc-900 rounded-xl p-4 space-y-2">
          <div className="text-sm text-zinc-400">This Month Spent</div>
          <div className="text-2xl font-bold">Rs {totalSpent.toLocaleString()}</div>
          <div className={`text-sm ${remainingOverall < 0 ? "text-red-400" : "text-emerald-400"}`}>
            Remaining: Rs {remainingOverall.toLocaleString()}
          </div>
          {remainingOverall < budgets.overall * 0.15 && remainingOverall >= 0 && (
            <div className="flex items-center gap-1 text-amber-400 text-xs mt-1">
              <AlertTriangle className="w-3 h-3" /> Low budget
            </div>
          )}
        </div>

        <div>
          <div className="text-sm font-medium mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> Category Budgets
          </div>
          <div className="space-y-3">
            {CATEGORIES.map((cat) => {
              const spent = categorySpent(cat);
              const budget = budgets[cat];
              const pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
              const over = spent > budget;

              return (
                <div key={cat}>
                  <div className="flex justify-between text-xs mb-1">
                    <span>{cat}</span>
                    <span className={over ? "text-red-400" : "text-zinc-400"}>
                      Rs {spent.toLocaleString()} / {budget.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${over ? "bg-red-500" : pct > 80 ? "bg-amber-500" : "bg-emerald-500"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="text-xs text-zinc-500 pt-4 border-t border-zinc-800">
          Data stays in your browser. Free forever.
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-zinc-500 mt-20 space-y-2">
              <p className="text-lg">Talk to your Expense Agent</p>
              <p className="text-sm">Try: “Spent 850 on lunch today”</p>
              <p className="text-sm">or “Set food budget to 20000”</p>
              <p className="text-sm">or “How much left in transport?”</p>
            </div>
          )}

          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                  m.role === "user"
                    ? "bg-emerald-600 text-white"
                    : "bg-zinc-800 text-zinc-100"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="text-zinc-500 text-sm">Thinking...</div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="p-4 border-t border-zinc-800">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Type expense or ask anything..."
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500"
            />
            <button
              onClick={sendMessage}
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-xl px-4 py-3"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
