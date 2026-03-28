"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useCallback, useRef, useEffect } from "react";
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

// ドラッグハンドルアイコン（共通）
function DragHandleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M8 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM8 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM8 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM20 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM20 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM20 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z" />
    </svg>
  );
}

type ItemProps = {
  bm: Bookmark;
  isSearching: boolean;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onDelete: (bm: Bookmark) => void;
};

// SSR / ハイドレーション用プレーンアイテム（DndContext 不要）
function PlainItem({ bm, isSearching, isSelected, onToggleSelect, onDelete }: ItemProps) {
  return (
    <li
      className={`flex items-center gap-3 px-4 py-3 ${
        isSearching ? "bg-blue-50 dark:bg-blue-950" : "bg-white dark:bg-gray-800"
      }`}
    >
      {/* ハンドル分のスペース確保（検索中は非表示） */}
      {isSearching ? null : (
        <span className="shrink-0 text-gray-400 dark:text-gray-500">
          <DragHandleIcon />
        </span>
      )}
      <input
        type="checkbox"
        checked={isSelected}
        onChange={() => onToggleSelect(bm.id)}
        className="h-4 w-4 shrink-0 cursor-pointer accent-blue-600"
        aria-label={`${bm.title}を選択`}
      />
      {bm.ogImage && (
        <img
          src={bm.ogImage}
          alt=""
          className="h-10 w-16 shrink-0 rounded object-cover"
          referrerPolicy="no-referrer"
        />
      )}
      <ItemContent bm={bm} onDelete={onDelete} />
    </li>
  );
}

// クライアント専用 DnD アイテム
function SortableItem({ bm, isSearching, isSelected, onToggleSelect, onDelete }: ItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: bm.id,
    disabled: isSearching,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 px-4 py-3 ${
        isSearching ? "bg-blue-50 dark:bg-blue-950" : "bg-white dark:bg-gray-800"
      }`}
    >
      {!isSearching && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="shrink-0 cursor-grab text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 active:cursor-grabbing"
          aria-label="ドラッグして並び替え"
        >
          <DragHandleIcon />
        </button>
      )}
      <input
        type="checkbox"
        checked={isSelected}
        onChange={() => onToggleSelect(bm.id)}
        className="h-4 w-4 shrink-0 cursor-pointer accent-blue-600"
        aria-label={`${bm.title}を選択`}
      />
      {bm.ogImage && (
        <img
          src={bm.ogImage}
          alt=""
          className="h-10 w-16 shrink-0 rounded object-cover"
          referrerPolicy="no-referrer"
        />
      )}
      <ItemContent bm={bm} onDelete={onDelete} />
    </li>
  );
}

// テキスト・ボタン部分（共通）
function ItemContent({
  bm,
  onDelete,
}: { bm: Bookmark; onDelete: (bm: Bookmark) => void }) {
  return (
    <>
      <div className="min-w-0 flex-1">
        <a
          href={bm.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block truncate font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          {bm.title}
        </a>
        <p className="truncate text-xs text-gray-500 dark:text-gray-400">{bm.url}</p>
        {bm.memo && (
          <p className="truncate text-sm text-gray-700 dark:text-gray-300">{bm.memo}</p>
        )}
      </div>
      <div className="flex shrink-0 gap-2">
        <Link
          href={`/bookmarks/${bm.id}/edit`}
          className="rounded border border-gray-300 px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          編集
        </Link>
        <button
          type="button"
          onClick={() => onDelete(bm)}
          className="cursor-pointer rounded border border-red-300 px-3 py-1 text-sm text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
        >
          削除
        </button>
      </div>
    </>
  );
}

export function BookmarkList({
  bookmarks: initial,
  isSearching,
}: {
  bookmarks: Bookmark[];
  isSearching: boolean;
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<Bookmark[]>(initial);
  const [pending, setPending] = useState<PendingDelete | null>(null);
  const pendingRef = useRef<PendingDelete | null>(null);

  // ハイドレーション完了後に DnD を有効化
  useEffect(() => {
    setMounted(true);
  }, []);

  // router.refresh() 後にサーバーから新しい initial が来たら items を同期
  useEffect(() => {
    setItems(initial);
  }, [initial]);

  // アンマウント時に未確定のタイマーをクリア
  useEffect(() => {
    return () => {
      if (pendingRef.current) clearTimeout(pendingRef.current.timerId);
    };
  }, []);

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
      if (pendingRef.current) {
        clearTimeout(pendingRef.current.timerId);
        void commitPending(pendingRef.current);
      }

      const timerId = setTimeout(() => {
        if (pendingRef.current) void commitPending(pendingRef.current);
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

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const itemsRef = useRef<Bookmark[]>(initial);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const handleDragEndWithSave = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const prev = itemsRef.current;
    const oldIndex = prev.findIndex((b) => b.id === active.id);
    const newIndex = prev.findIndex((b) => b.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const next = [...prev];
    const [moved] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, moved);

    setItems(next);

    try {
      const res = await fetch("/api/bookmarks/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: next.map((b) => b.id) }),
      });
      if (!res.ok) {
        setItems(prev);
      }
    } catch {
      setItems(prev);
    }
  }, []);

  const itemProps = (bm: Bookmark) => ({
    bm,
    isSearching,
    isSelected: selectedIds.has(bm.id),
    onToggleSelect: toggleSelect,
    onDelete: handleDelete,
  });

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
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

      {mounted ? (
        // クライアントマウント後: DnD 有効
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEndWithSave}
        >
          <SortableContext items={items.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            <ul className="divide-y divide-gray-200 rounded-lg border dark:divide-gray-700 dark:border-gray-700">
              {items.map((bm) => (
                <SortableItem key={bm.id} {...itemProps(bm)} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      ) : (
        // SSR / ハイドレーション: DndContext なしでプレーンリスト
        <ul className="divide-y divide-gray-200 rounded-lg border dark:divide-gray-700 dark:border-gray-700">
          {items.map((bm) => (
            <PlainItem key={bm.id} {...itemProps(bm)} />
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
