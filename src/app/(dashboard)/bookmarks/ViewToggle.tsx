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
    <div className="flex rounded border border-gray-300 overflow-hidden">
      <button
        type="button"
        onClick={() => toggle("card")}
        className={`px-3 py-1.5 text-sm ${view === "card" ? "bg-gray-200 font-medium text-gray-900" : "text-gray-500 hover:bg-gray-100"}`}
        title="カード表示"
      >
        ⊞
      </button>
      <button
        type="button"
        onClick={() => toggle("list")}
        className={`px-3 py-1.5 text-sm border-l border-gray-300 ${view === "list" ? "bg-gray-200 font-medium text-gray-900" : "text-gray-500 hover:bg-gray-100"}`}
        title="リスト表示"
      >
        ≡
      </button>
    </div>
  );
}
