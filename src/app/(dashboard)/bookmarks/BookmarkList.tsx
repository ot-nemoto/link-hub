"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useCallback, useRef, useEffect } from "react";
import { ViewToggle, type ViewMode } from "./ViewToggle";
import { UndoSnackbar } from "./UndoSnackbar";
import { deleteBookmark, deleteBookmarks } from "./actions";

type Bookmark = {
  id: string;
  url: string;
  title: string;
  memo: string | null;
  ogImage: string | null;
};

type PendingDelete = {
  bookmarks: Bookmark[];
  timerId: ReturnType<typeof setTimeout>;
};

const UNDO_TIMEOUT_MS = 5000;

export function BookmarkList({ bookmarks: initial }: { bookmarks: Bookmark[] }) {
  const router = useRouter();
  const [view, setView] = useState<ViewMode>("card");
  const handleViewChange = useCallback((mode: ViewMode) => setView(mode), []);

  const [items, setItems] = useState<Bookmark[]>(initial);
  const [pending, setPending] = useState<PendingDelete | null>(null);
  const pendingRef = useRef<PendingDelete | null>(null);

  // router.refresh() 後に server から新しい initial が来たら items を同期
  useEffect(() => {
    setItems(initial);
  }, [initial]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const allSelected = items.length > 0 && selectedIds.size === items.length;

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedIds((prev) =>
      prev.size === items.length ? new Set() : new Set(items.map((b) => b.id)),
    );
  }, [items]);

  // 共通: pending を確定削除してリフレッシュ
  const commitPending = useCallback(
    async (p: PendingDelete) => {
      const ids = p.bookmarks.map((b) => b.id);
      if (ids.length === 1) {
        await deleteBookmark(ids[0], {});
      } else {
        await deleteBookmarks(ids);
      }
      setPending(null);
      pendingRef.current = null;
      router.refresh();
    },
    [router],
  );

  const startPending = useCallback(
    (bookmarks: Bookmark[]) => {
      // 既存 pending があればすぐに確定
      if (pendingRef.current) {
        clearTimeout(pendingRef.current.timerId);
        commitPending(pendingRef.current);
      }

      const timerId = setTimeout(() => {
        if (pendingRef.current) commitPending(pendingRef.current);
      }, UNDO_TIMEOUT_MS);

      const next = { bookmarks, timerId };
      setPending(next);
      pendingRef.current = next;
    },
    [commitPending],
  );

  const handleDelete = useCallback(
    (bm: Bookmark) => {
      setItems((prev) => prev.filter((b) => b.id !== bm.id));
      startPending([bm]);
    },
    [startPending],
  );

  const handleBulkDelete = useCallback(() => {
    const targets = items.filter((b) => selectedIds.has(b.id));
    if (targets.length === 0) return;
    setItems((prev) => prev.filter((b) => !selectedIds.has(b.id)));
    setSelectedIds(new Set());
    startPending(targets);
  }, [items, selectedIds, startPending]);

  const handleUndo = useCallback(() => {
    if (!pendingRef.current) return;
    clearTimeout(pendingRef.current.timerId);
    const { bookmarks } = pendingRef.current;
    setPending(null);
    pendingRef.current = null;
    setItems((prev) => [...prev, ...bookmarks]);
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
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleAll}
            className="cursor-pointer rounded border border-gray-300 px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {allSelected ? "全解除" : "全選択"}
          </button>
          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={handleBulkDelete}
              className="cursor-pointer rounded border border-red-300 px-3 py-1 text-sm text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
            >
              選択削除（{selectedIds.size}件）
            </button>
          )}
        </div>
        <ViewToggle onViewChange={handleViewChange} />
      </div>

      {view === "card" ? (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((bm) => (
            <li
              key={bm.id}
              className="rounded-lg border bg-white shadow-sm flex flex-col dark:border-gray-700 dark:bg-gray-800"
            >
              {bm.ogImage && (
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
                {bm.memo && (
                  <p className="text-sm text-gray-700 line-clamp-3 dark:text-gray-300">{bm.memo}</p>
                )}
                <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(bm.id)}
                    onChange={() => toggleSelect(bm.id)}
                    className="h-4 w-4 cursor-pointer accent-blue-600"
                    aria-label={`${bm.title}を選択`}
                  />
                  <div className="flex gap-2">
                    <Link
                      href={`/bookmarks/${bm.id}/edit`}
                      className="rounded border border-gray-300 px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      編集
                    </Link>
                    <DeleteBtn bm={bm} />
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="divide-y divide-gray-200 rounded-lg border bg-white dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-800">
          {items.map((bm) => (
            <li key={bm.id} className="flex items-center gap-3 px-4 py-3">
              <input
                type="checkbox"
                checked={selectedIds.has(bm.id)}
                onChange={() => toggleSelect(bm.id)}
                className="h-4 w-4 cursor-pointer accent-blue-600 shrink-0"
                aria-label={`${bm.title}を選択`}
              />
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
        <UndoSnackbar
          message={
            pending.bookmarks.length === 1
              ? "削除しました"
              : `${pending.bookmarks.length}件削除しました`
          }
          onUndo={handleUndo}
        />
      )}
    </div>
  );
}
