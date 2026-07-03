"use client";

import { useState } from "react";
import { writeCollapsedCookie } from "@/lib/collapsed-cookie";
import type { Bookmark } from "./types";

export const TRASH_COLLAPSE_KEY = "__trash__";

export function TrashGroup({
  bookmarks,
  initialCollapsed,
  processingIds,
  onRestore,
  onEmptyTrash,
}: {
  bookmarks: Bookmark[];
  initialCollapsed: boolean;
  processingIds: Set<string>;
  onRestore: (bm: Bookmark) => void;
  onEmptyTrash: () => void;
}) {
  const [collapsed, setCollapsed] = useState<boolean>(initialCollapsed);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      writeCollapsedCookie(TRASH_COLLAPSE_KEY, next);
      return next;
    });
  };

  return (
    <div id={`category-${TRASH_COLLAPSE_KEY}`} className="mb-6 scroll-mt-28">
      <div className="mb-2 flex w-full items-center gap-2 border-b border-zinc-200 pb-1.5">
        <button
          type="button"
          onClick={toggleCollapsed}
          className="flex flex-1 cursor-pointer items-center gap-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="text-zinc-400"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
          <span className="text-sm font-medium text-zinc-500">ゴミ箱</span>
          <span className="text-xs text-zinc-400">{bookmarks.length}</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={`ml-auto text-zinc-400 transition-transform ${collapsed ? "-rotate-90" : ""}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onEmptyTrash}
          className="shrink-0 cursor-pointer rounded border border-red-300 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
        >
          全削除
        </button>
      </div>

      {!collapsed && (
        <ul className="flex flex-col gap-2 pl-5">
          {bookmarks.map((bm) => (
            <li
              key={bm.id}
              className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-zinc-700">{bm.title}</p>
                <p className="truncate text-xs text-zinc-400">{bm.url}</p>
              </div>
              <button
                type="button"
                onClick={() => onRestore(bm)}
                disabled={processingIds.has(bm.id)}
                className="shrink-0 cursor-pointer rounded bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                復元
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
