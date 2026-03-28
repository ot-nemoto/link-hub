"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = saved === "dark" || (!saved && prefersDark);
    setDark(isDark);
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="cursor-pointer rounded border border-gray-300 px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
      title={dark ? "ライトモードに切り替え" : "ダークモードに切り替え"}
    >
      {dark ? "☀️" : "🌙"}
    </button>
  );
}
