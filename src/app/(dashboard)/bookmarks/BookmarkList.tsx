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
import { BulkTagPanel } from "./BulkTagPanel";
import { InlineTagEditor } from "./InlineTagEditor";
import { TagFilter, UNTAGGED_ID, type TagFilterItem } from "./TagFilter";
import { UndoSnackbar } from "./UndoSnackbar";
import { bulkAddTags, deleteBookmark, deleteBookmarks, reorderBookmarks } from "./actions";

type BookmarkTag = { tagId: string; tag: { id: string; name: string } };

type Bookmark = {
  id: string;
  url: string;
  title: string;
  memo: string | null;
  ogImage: string | null;
  tags: BookmarkTag[];
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
  isDndDisabled: boolean;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onDelete: (bm: Bookmark) => void;
  allTags: TagFilterItem[];
  editingTags: boolean;
  onEditTagsStart: () => void;
  onEditTagsSave: (tagIds: string[], newTags: TagFilterItem[]) => void;
  onEditTagsCancel: () => void;
};

// SSR / ハイドレーション用プレーンアイテム（DndContext 不要）
function PlainItem({ bm, isSearching, isDndDisabled, isSelected, onToggleSelect, onDelete, allTags, editingTags, onEditTagsStart, onEditTagsSave, onEditTagsCancel }: ItemProps) {
  return (
    <li
      className={`flex items-center gap-3 px-4 py-3 ${
        isSearching ? "bg-blue-50 dark:bg-blue-950" : "bg-white dark:bg-gray-800"
      }`}
    >
      {/* ハンドル分のスペース確保（検索中またはフィルター中は非表示） */}
      {isDndDisabled ? null : (
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
      <ItemContent bm={bm} onDelete={onDelete} allTags={allTags} editingTags={editingTags} onEditTagsStart={onEditTagsStart} onEditTagsSave={onEditTagsSave} onEditTagsCancel={onEditTagsCancel} />
    </li>
  );
}

// クライアント専用 DnD アイテム
function SortableItem({ bm, isSearching, isDndDisabled, isSelected, onToggleSelect, onDelete, allTags, editingTags, onEditTagsStart, onEditTagsSave, onEditTagsCancel }: ItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: bm.id,
    disabled: isDndDisabled,
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
      {!isDndDisabled && (
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
      <ItemContent bm={bm} onDelete={onDelete} allTags={allTags} editingTags={editingTags} onEditTagsStart={onEditTagsStart} onEditTagsSave={onEditTagsSave} onEditTagsCancel={onEditTagsCancel} />
    </li>
  );
}

// テキスト・ボタン部分（共通）
function ItemContent({
  bm,
  onDelete,
  allTags,
  editingTags,
  onEditTagsStart,
  onEditTagsSave,
  onEditTagsCancel,
}: {
  bm: Bookmark;
  onDelete: (bm: Bookmark) => void;
  allTags: TagFilterItem[];
  editingTags: boolean;
  onEditTagsStart: () => void;
  onEditTagsSave: (tagIds: string[], newTags: TagFilterItem[]) => void;
  onEditTagsCancel: () => void;
}) {
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
        <div className="mt-1 flex flex-wrap items-center gap-1">
          {bm.tags.map((bt) => {
            const tagName = allTags.find((t) => t.id === bt.tagId)?.name ?? bt.tag.name;
            return (
              <span
                key={bt.tagId}
                className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900 dark:text-blue-300"
              >
                {tagName}
              </span>
            );
          })}
          <button
            type="button"
            onClick={onEditTagsStart}
            className="rounded px-1.5 py-0.5 text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
          >
            タグ編集
          </button>
        </div>
        {editingTags && (
          <InlineTagEditor
            bookmarkId={bm.id}
            allTags={allTags}
            currentTagIds={bm.tags.map((bt) => bt.tagId)}
            onSave={onEditTagsSave}
            onCancel={onEditTagsCancel}
          />
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
  allTags,
}: {
  bookmarks: Bookmark[];
  isSearching: boolean;
  allTags: TagFilterItem[];
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<Bookmark[]>(initial);
  const [allTagsState, setAllTagsState] = useState<TagFilterItem[]>(allTags);
  const [activeTagIds, setActiveTagIds] = useState<string[]>([]);
  const [editingTagsId, setEditingTagsId] = useState<string | null>(null);
  const [isBulkTagging, setIsBulkTagging] = useState(false);
  const [bulkTagSaving, setBulkTagSaving] = useState(false);
  const [pending, setPending] = useState<PendingDelete | null>(null);
  const pendingRef = useRef<PendingDelete | null>(null);

  // ハイドレーション完了後に DnD を有効化
  useEffect(() => {
    setMounted(true);
  }, []);

  // router.refresh() 後にサーバーから新しいデータが来たら同期
  useEffect(() => {
    setItems(initial);
  }, [initial]);

  useEffect(() => {
    setAllTagsState(allTags);
  }, [allTags]);

  // アンマウント時に未確定のタイマーをクリア
  useEffect(() => {
    return () => {
      if (pendingRef.current) clearTimeout(pendingRef.current.timerId);
    };
  }, []);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredItems =
    activeTagIds.length === 0
      ? items
      : items.filter((bm) => {
          if (activeTagIds.includes(UNTAGGED_ID) && bm.tags.length === 0) return true;
          return activeTagIds.some(
            (tid) => tid !== UNTAGGED_ID && bm.tags.some((bt) => bt.tagId === tid),
          );
        });

  const allSelected = filteredItems.length > 0 && selectedIds.size === filteredItems.length;

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
      prev.size === filteredItems.length
        ? new Set()
        : new Set(filteredItems.map((b) => b.id)),
    );
  }, [filteredItems]);

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
    const targets = filteredItems.filter((b) => selectedIds.has(b.id));
    if (targets.length === 0) return;
    const idsToDelete = new Set(targets.map((b) => b.id));
    setItems((prev) => prev.filter((b) => !idsToDelete.has(b.id)));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of idsToDelete) next.delete(id);
      return next;
    });
    startPending(targets);
  }, [filteredItems, selectedIds, startPending]);

  const handleUndo = useCallback(() => {
    if (!pendingRef.current) return;
    clearTimeout(pendingRef.current.timerId);
    const { bookmarks } = pendingRef.current;
    setPending(null);
    pendingRef.current = null;
    setItems((prev) => [...prev, ...bookmarks]);
  }, []);

  const handleEditTagsSave = useCallback(
    (bookmarkId: string, tagIds: string[], newTags: TagFilterItem[]) => {
      // 新規作成タグを allTagsState に反映
      const nextAllTags =
        newTags.length > 0
          ? [...allTagsState, ...newTags.filter((t) => !allTagsState.find((a) => a.id === t.id))].sort(
              (a, b) => a.name.localeCompare(b.name),
            )
          : allTagsState;
      if (newTags.length > 0) setAllTagsState(nextAllTags);

      // ブックマークのタグを楽観的に更新
      setItems((prev) =>
        prev.map((bm) => {
          if (bm.id !== bookmarkId) return bm;
          return {
            ...bm,
            tags: tagIds.map((tid) => {
              const tag = nextAllTags.find((t) => t.id === tid) ?? { id: tid, name: tid };
              return { tagId: tid, tag: { id: tid, name: tag.name } };
            }),
          };
        }),
      );
      setEditingTagsId(null);
      router.refresh();
    },
    [allTagsState, router],
  );

  const handleBulkTagsSave = useCallback(
    async (tagIds: string[]) => {
      if (tagIds.length === 0) return;
      setBulkTagSaving(true);
      const bookmarkIds = Array.from(selectedIds);
      const result = await bulkAddTags(bookmarkIds, tagIds);
      setBulkTagSaving(false);
      if (result.error) return;

      // 選択中ブックマークに対して楽観的にタグを追加
      setItems((prev) =>
        prev.map((bm) => {
          if (!selectedIds.has(bm.id)) return bm;
          const existingTagIds = new Set(bm.tags.map((bt) => bt.tagId));
          const newTags = tagIds
            .filter((tid) => !existingTagIds.has(tid))
            .map((tid) => {
              const tag = allTagsState.find((t) => t.id === tid) ?? { id: tid, name: tid };
              return { tagId: tid, tag: { id: tid, name: tag.name } };
            });
          return { ...bm, tags: [...bm.tags, ...newTags] };
        }),
      );
      setIsBulkTagging(false);
      router.refresh();
    },
    [selectedIds, allTagsState, router],
  );

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
      const result = await reorderBookmarks(next.map((b) => b.id));
      if (result.error) {
        setItems(prev);
      }
    } catch {
      setItems(prev);
    }
  }, []);

  const isDndDisabled = isSearching || activeTagIds.length > 0;

  const itemProps = (bm: Bookmark) => ({
    bm,
    isSearching,
    isDndDisabled,
    isSelected: selectedIds.has(bm.id),
    onToggleSelect: toggleSelect,
    onDelete: handleDelete,
    allTags: allTagsState,
    editingTags: editingTagsId === bm.id,
    onEditTagsStart: () => setEditingTagsId(bm.id),
    onEditTagsSave: (tagIds: string[], newTags: TagFilterItem[]) =>
      handleEditTagsSave(bm.id, tagIds, newTags),
    onEditTagsCancel: () => setEditingTagsId(null),
  });

  return (
    <div>
      <TagFilter
        tags={allTagsState}
        selectedTagIds={activeTagIds}
        onChange={setActiveTagIds}
      />

      <div className="mb-3 flex items-center gap-2">
        <button
          type="button"
          onClick={toggleAll}
          className="cursor-pointer rounded border border-gray-300 px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          {allSelected ? "全解除" : "全選択"}
        </button>
        {selectedIds.size > 0 && (
          <>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {selectedIds.size}件選択中
            </span>
            <button
              type="button"
              onClick={() => setIsBulkTagging((prev) => !prev)}
              className="cursor-pointer rounded border border-blue-300 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-950"
            >
              タグを追加
            </button>
            <button
              type="button"
              onClick={handleBulkDelete}
              className="cursor-pointer rounded border border-red-300 px-3 py-1 text-sm text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
            >
              削除
            </button>
          </>
        )}
      </div>

      {isBulkTagging && (
        <BulkTagPanel
          allTags={allTagsState}
          saving={bulkTagSaving}
          onSave={handleBulkTagsSave}
          onCancel={() => setIsBulkTagging(false)}
        />
      )}

      {filteredItems.length === 0 && activeTagIds.length > 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 py-12 text-center text-sm text-gray-500 dark:border-gray-600 dark:text-gray-400">
          該当するブックマークがありません
        </div>
      ) : mounted ? (
        // クライアントマウント後: DnD 有効
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEndWithSave}
        >
          <SortableContext items={filteredItems.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            <ul className="divide-y divide-gray-200 rounded-lg border dark:divide-gray-700 dark:border-gray-700">
              {filteredItems.map((bm) => (
                <SortableItem key={bm.id} {...itemProps(bm)} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      ) : (
        // SSR / ハイドレーション: DndContext なしでプレーンリスト
        <ul className="divide-y divide-gray-200 rounded-lg border dark:divide-gray-700 dark:border-gray-700">
          {filteredItems.map((bm) => (
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
