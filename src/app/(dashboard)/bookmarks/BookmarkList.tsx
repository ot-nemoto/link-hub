"use client";

import Link from "next/link";
import { useState, useCallback } from "react";
import { ViewToggle, type ViewMode } from "./ViewToggle";
import { DeleteButton } from "./DeleteButton";

type Bookmark = {
  id: string;
  url: string;
  title: string;
  memo: string | null;
  ogImage: string | null;
};

export function BookmarkList({ bookmarks }: { bookmarks: Bookmark[] }) {
  const [view, setView] = useState<ViewMode>("card");
  const handleViewChange = useCallback((mode: ViewMode) => setView(mode), []);

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <ViewToggle onViewChange={handleViewChange} />
      </div>

      {view === "card" ? (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {bookmarks.map((bm) => (
            <li key={bm.id} className="rounded-lg border bg-white shadow-sm flex flex-col dark:border-gray-700 dark:bg-gray-800">
              {bm.ogImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={bm.ogImage}
                  alt=""
                  className="h-36 w-full rounded-t-lg object-cover"
                  referrerPolicy="no-referrer"
                />
              )}
              <div className="flex flex-1 flex-col gap-1 p-4">
                <a
                  href={bm.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-blue-600 hover:underline line-clamp-2 dark:text-blue-400"
                >
                  {bm.title}
                </a>
                <p className="truncate text-xs text-gray-500 dark:text-gray-400">{bm.url}</p>
                {bm.memo && <p className="text-sm text-gray-700 line-clamp-3 dark:text-gray-300">{bm.memo}</p>}
                <div className="mt-auto flex justify-end gap-2 pt-2">
                  <Link
                    href={`/bookmarks/${bm.id}/edit`}
                    className="rounded border border-gray-300 px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    編集
                  </Link>
                  <DeleteButton id={bm.id} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="divide-y divide-gray-200 rounded-lg border bg-white dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-800">
          {bookmarks.map((bm) => (
            <li key={bm.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <a
                  href={bm.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-blue-600 hover:underline truncate block dark:text-blue-400"
                >
                  {bm.title}
                </a>
                <p className="truncate text-xs text-gray-500 dark:text-gray-400">{bm.url}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Link
                  href={`/bookmarks/${bm.id}/edit`}
                  className="rounded border border-gray-300 px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  編集
                </Link>
                <DeleteButton id={bm.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
