"use client";

import Link from "next/link";
import { useState, useCallback, useRef } from "react";
import { ViewToggle, type ViewMode } from "./ViewToggle";
import { UndoSnackbar } from "./UndoSnackbar";
import { deleteBookmark } from "./actions";

type Bookmark = {
  id: string;
  url: string;
  title: string;
  memo: string | null;
  ogImage: string | null;
};

type PendingDelete = {
  bookmark: Bookmark;
  timerId: ReturnType<typeof setTimeout>;
};

const UNDO_TIMEOUT_MS = 5000;

export function BookmarkList({ bookmarks: initial }: { bookmarks: Bookmark[] }) {
  const [view, setView] = useState<ViewMode>("card");
  const handleViewChange = useCallback((mode: ViewMode) => setView(mode), []);

  const [items, setItems] = useState<Bookmark[]>(initial);
  const [pending, setPending] = useState<PendingDelete | null>(null);
  const pendingRef = useRef<PendingDelete | null>(null);

  const handleDelete = useCallback((bm: Bookmark) => {
    // 既存の pending があればすぐに確定削除
    if (pendingRef.current) {
      clearTimeout(pendingRef.current.timerId);
      deleteBookmark(pendingRef.current.bookmark.id, {});
    }

    // 楽観的 UI: 一覧から除外
    setItems((prev) => prev.filter((b) => b.id !== bm.id));

    // 5秒後に実際に削除
    const timerId = setTimeout(async () => {
      await deleteBookmark(bm.id, {});
      setPending(null);
      pendingRef.current = null;
    }, UNDO_TIMEOUT_MS);

    const next = { bookmark: bm, timerId };
    setPending(next);
    pendingRef.current = next;
  }, []);

  const handleUndo = useCallback(() => {
    if (!pendingRef.current) return;
    clearTimeout(pendingRef.current.timerId);
    const { bookmark } = pendingRef.current;
    setPending(null);
    pendingRef.current = null;
    setItems((prev) => [...prev, bookmark]);
  }, []);

  const DeleteBtn = ({ bm }: { bm: Bookmark }) => (
    <button
      type="button"
      onClick={() => handleDelete(bm)}
      className="cursor-pointer rounded border border-red-300 px-3 py-1 text-sm text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
    >
      削除
    </button>
  );

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <ViewToggle onViewChange={handleViewChange} />
      </div>

      {view === "card" ? (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((bm) => (
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
                  <DeleteBtn bm={bm} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="divide-y divide-gray-200 rounded-lg border bg-white dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-800">
          {items.map((bm) => (
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
                <DeleteBtn bm={bm} />
              </div>
            </li>
          ))}
        </ul>
      )}

      {pending && (
        <UndoSnackbar message="削除しました" onUndo={handleUndo} />
      )}
    </div>
  );
}
