"use client";

import { useEffect, useState } from "react";

export type ViewMode = "card" | "list";

const STORAGE_KEY = "bookmark-view-mode";

export function ViewToggle({ onViewChange }: { onViewChange: (mode: ViewMode) => void }) {
  const [view, setView] = useState<ViewMode>("card");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as ViewMode | null;
    if (saved === "card" || saved === "list") {
      setView(saved);
      onViewChange(saved);
    }
  }, [onViewChange]);

  const toggle = (mode: ViewMode) => {
    setView(mode);
    localStorage.setItem(STORAGE_KEY, mode);
    onViewChange(mode);
  };

  return (
    <div className="flex rounded border border-gray-300 dark:border-gray-600 overflow-hidden">
      <button
        type="button"
        onClick={() => toggle("card")}
        aria-label="カード表示"
        aria-pressed={view === "card"}
        className={`px-3 py-1.5 text-sm ${view === "card" ? "bg-gray-200 font-medium text-gray-900 dark:bg-gray-600 dark:text-white" : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"}`}
      >
        ⊞
      </button>
      <button
        type="button"
        onClick={() => toggle("list")}
        aria-label="リスト表示"
        aria-pressed={view === "list"}
        className={`px-3 py-1.5 text-sm border-l border-gray-300 dark:border-gray-600 ${view === "list" ? "bg-gray-200 font-medium text-gray-900 dark:bg-gray-600 dark:text-white" : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"}`}
      >
        ≡
      </button>
    </div>
  );
}
