"use client";

import {
  type CollisionDetection,
  closestCenter,
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { BookmarkAddModal } from "@/components/BookmarkAddModal";
import { BookmarkEditModal } from "@/components/BookmarkEditModal";
import { TagManagementModal } from "@/components/TagManagementModal";
import { getTagColor } from "@/lib/tag-colors";
import {
  createBookmark,
  createTag,
  deleteBookmark,
  deleteBookmarks,
  deleteTag,
  moveBookmark,
  reorderBookmarks,
  reorderTags,
  updateBookmark,
} from "./actions";
import { UndoSnackbar } from "./UndoSnackbar";

const UNCATEGORIZED_KEY = "__uncategorized__";
const UNDO_TIMEOUT_MS = 5000;

type Bookmark = {
  id: string;
  url: string;
  title: string;
  memo: string | null;
  ogImage: string | null;
  sortOrder: number;
  tag: { id: string; name: string } | null;
  tagId: string | null;
};

type TagItem = { id: string; name: string };
type TagWithCount = { id: string; name: string; bookmarkCount: number };

type PendingDelete = {
  bookmarks: Bookmark[];
  timerId: ReturnType<typeof setTimeout>;
};

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

function SortableBookmarkItem({
  bm,
  isSearching,
  onEdit,
  onDelete,
}: {
  bm: Bookmark;
  isSearching: boolean;
  onEdit: (bm: Bookmark) => void;
  onDelete: (bm: Bookmark) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: bm.id,
    disabled: isSearching,
    data: { type: "bookmark", tagId: bm.tagId },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || undefined,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 hover:border-zinc-400 hover:bg-zinc-50"
    >
      {!isSearching && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="shrink-0 cursor-grab text-zinc-400 hover:text-zinc-600 active:cursor-grabbing"
          aria-label="ドラッグして並び替え"
        >
          <DragHandleIcon />
        </button>
      )}
      <BookmarkItemContent bm={bm} onEdit={onEdit} onDelete={onDelete} />
    </li>
  );
}

function BookmarkItemContent({
  bm,
  onEdit,
  onDelete,
}: {
  bm: Bookmark;
  onEdit: (bm: Bookmark) => void;
  onDelete: (bm: Bookmark) => void;
}) {
  return (
    <>
      <div className="min-w-0 flex-1">
        <a
          href={bm.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block truncate text-sm font-medium text-zinc-900 transition-colors duration-150 hover:text-purple-700 hover:underline"
        >
          {bm.title}
        </a>
        <p className="truncate text-xs text-zinc-400">{bm.url}</p>
        {bm.memo && <p className="truncate text-sm text-zinc-600">{bm.memo}</p>}
      </div>
      {bm.ogImage && (
        <img
          src={bm.ogImage}
          alt=""
          className="h-20 w-36 shrink-0 rounded object-contain"
          referrerPolicy="no-referrer"
        />
      )}
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={() => onEdit(bm)}
          className="cursor-pointer rounded bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-200"
        >
          編集
        </button>
        <button
          type="button"
          onClick={() => onDelete(bm)}
          className="cursor-pointer rounded border border-red-300 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
        >
          削除
        </button>
      </div>
    </>
  );
}

function CategoryDropZone({ categoryKey }: { categoryKey: string }) {
  const { setNodeRef, isOver } = useSortable({
    id: `drop-zone-${categoryKey}`,
    data: { type: "drop-zone", tagId: categoryKey === UNCATEGORIZED_KEY ? null : categoryKey },
  });

  if (!isOver) return <div ref={setNodeRef} className="h-1" />;

  return (
    <div
      ref={setNodeRef}
      className="rounded-md border-2 border-dashed border-blue-400 bg-blue-50 py-4 text-center text-xs text-blue-500"
    >
      ここにドロップ
    </div>
  );
}

function CategoryGroup({
  categoryKey,
  tag,
  bookmarks,
  isSearching,
  onEdit,
  onDelete,
}: {
  categoryKey: string;
  tag: TagItem | null;
  bookmarks: Bookmark[];
  isSearching: boolean;
  onEdit: (bm: Bookmark) => void;
  onDelete: (bm: Bookmark) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const color = tag ? getTagColor(tag.name) : null;
  const isSortable = tag !== null;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `category-${categoryKey}`,
    disabled: !isSortable,
    data: { type: "category" },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || undefined,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="mb-6">
      <div className="mb-2 flex w-full items-center gap-2 border-b border-zinc-200 pb-1.5">
        {isSortable && (
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="shrink-0 cursor-grab text-zinc-400 hover:text-zinc-600 active:cursor-grabbing"
            aria-label="ドラッグしてカテゴリを並び替え"
          >
            <DragHandleIcon />
          </button>
        )}
        <button
          type="button"
          onClick={() => setCollapsed((prev) => !prev)}
          className="flex flex-1 cursor-pointer items-center gap-2"
        >
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full ${color ? color.activeBg : "bg-zinc-400"}`}
          />
          <span className={`text-sm font-medium ${tag ? "text-zinc-900" : "text-zinc-500"}`}>
            {tag ? tag.name : "未分類"}
          </span>
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
      </div>

      {!collapsed && (
        <div className="pl-5">
          <SortableContext
            items={[...bookmarks.map((b) => b.id), `drop-zone-${categoryKey}`]}
            strategy={verticalListSortingStrategy}
          >
            <ul className="flex flex-col gap-2">
              {bookmarks.map((bm) => (
                <SortableBookmarkItem
                  key={bm.id}
                  bm={bm}
                  isSearching={isSearching}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
              <CategoryDropZone categoryKey={categoryKey} />
            </ul>
          </SortableContext>
        </div>
      )}
    </div>
  );
}

export function BookmarkList({
  bookmarks: initial,
  allTags,
  tagsWithCount,
}: {
  bookmarks: Bookmark[];
  allTags: TagItem[];
  tagsWithCount: TagWithCount[];
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState<Bookmark[]>(initial);
  const [allTagsState, setAllTagsState] = useState<TagItem[]>(allTags);
  const [tagsWithCountState, setTagsWithCountState] = useState<TagWithCount[]>(tagsWithCount);
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBookmarkId, setEditingBookmarkId] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingDelete | null>(null);
  const pendingRef = useRef<PendingDelete | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);
  useEffect(() => {
    setItems(initial);
  }, [initial]);
  useEffect(() => {
    setAllTagsState(allTags);
  }, [allTags]);
  useEffect(() => {
    setTagsWithCountState(tagsWithCount);
  }, [tagsWithCount]);
  useEffect(() => {
    return () => {
      if (pendingRef.current) clearTimeout(pendingRef.current.timerId);
    };
  }, []);

  const isSearching = searchQuery.trim().length > 0;

  const filteredItems = isSearching
    ? (() => {
        const q = searchQuery.toLowerCase();
        return items.filter(
          (bm) =>
            bm.title.toLowerCase().includes(q) ||
            bm.url.toLowerCase().includes(q) ||
            (bm.memo?.toLowerCase().includes(q) ?? false),
        );
      })()
    : items;

  const groupedBookmarks = (() => {
    const groups: { key: string; tag: TagItem | null; bookmarks: Bookmark[] }[] = [];
    const tagMap = new Map<string, Bookmark[]>();
    const uncategorized: Bookmark[] = [];

    for (const bm of filteredItems) {
      if (bm.tagId) {
        const existing = tagMap.get(bm.tagId);
        if (existing) existing.push(bm);
        else tagMap.set(bm.tagId, [bm]);
      } else {
        uncategorized.push(bm);
      }
    }

    for (const tag of allTagsState) {
      const bms = (tagMap.get(tag.id) ?? []).toSorted((a, b) => a.sortOrder - b.sortOrder);
      groups.push({ key: tag.id, tag, bookmarks: bms });
    }

    uncategorized.sort((a, b) => a.sortOrder - b.sortOrder);
    groups.push({ key: UNCATEGORIZED_KEY, tag: null, bookmarks: uncategorized });

    return groups;
  })();

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

  const collisionDetection: CollisionDetection = useCallback((args) => {
    const activeData = args.active.data.current as { type: string } | undefined;
    if (activeData?.type === "category") {
      const categoryContainers = args.droppableContainers.filter(
        (c) => (c.data.current as { type: string } | undefined)?.type === "category",
      );
      return closestCenter({ ...args, droppableContainers: categoryContainers });
    }
    return closestCenter(args);
  }, []);

  const itemsRef = useRef<Bookmark[]>(initial);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const allTagsRef = useRef<TagItem[]>(allTags);
  useEffect(() => {
    allTagsRef.current = allTagsState;
  }, [allTagsState]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) return;

      const activeData = active.data.current as { type: string; tagId: string | null } | undefined;
      const overData = over.data.current as { type: string; tagId: string | null } | undefined;
      if (!activeData || activeData.type !== "bookmark") return;

      let targetTagId: string | null | undefined;

      if (overData?.type === "drop-zone") {
        targetTagId = overData.tagId;
      } else if (overData?.type === "bookmark") {
        targetTagId = overData.tagId;
      } else {
        return;
      }

      if (targetTagId === undefined) return;
      if (activeData.tagId === targetTagId) return;

      const draggedId = active.id as string;
      const newTag = targetTagId ? (allTagsState.find((t) => t.id === targetTagId) ?? null) : null;

      setItems((prev) =>
        prev.map((bm) =>
          bm.id === draggedId ? { ...bm, tagId: targetTagId ?? null, tag: newTag } : bm,
        ),
      );
    },
    [allTagsState],
  );

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current as { type: string } | undefined;
    if (activeData?.type === "category") {
      const activeKey = (active.id as string).replace("category-", "");
      const overKey = (over.id as string).replace("category-", "");
      if (activeKey === overKey) return;

      const oldTags = allTagsRef.current;
      const oldIndex = oldTags.findIndex((t) => t.id === activeKey);
      const overIndex = oldTags.findIndex((t) => t.id === overKey);
      if (oldIndex === -1 || overIndex === -1) return;

      const newTags = [...oldTags];
      const [moved] = newTags.splice(oldIndex, 1);
      newTags.splice(overIndex, 0, moved);
      setAllTagsState(newTags);

      try {
        const result = await reorderTags(
          newTags.map((t) => t.id),
          { skipRevalidate: true },
        );
        if (result.error) throw new Error(result.error);
      } catch {
        setAllTagsState(oldTags);
      }
      return;
    }

    const draggedId = active.id as string;
    const bm = itemsRef.current.find((b) => b.id === draggedId);
    if (!bm) return;

    const overData = over.data.current as { type: string; tagId: string | null } | undefined;

    let targetTagId: string | null;
    if (overData?.type === "drop-zone") {
      targetTagId = overData.tagId;
    } else if (overData?.type === "bookmark") {
      targetTagId = overData.tagId;
    } else {
      targetTagId = bm.tagId;
    }

    const currentItems = itemsRef.current;
    const categoryItems = currentItems
      .filter((b) => b.tagId === targetTagId)
      .toSorted((a, b) => a.sortOrder - b.sortOrder);
    const overId = over.id as string;

    let newSortOrder: number;
    if (overData?.type === "drop-zone") {
      const maxSort = categoryItems
        .filter((b) => b.id !== draggedId)
        .reduce((max, b) => Math.max(max, b.sortOrder ?? 0), -1);
      newSortOrder = maxSort + 1;
    } else {
      const overIndex = categoryItems.findIndex((b) => b.id === overId);
      if (overIndex === -1) {
        newSortOrder = categoryItems.length;
      } else {
        newSortOrder = overIndex;
      }
    }

    const sameCategory = categoryItems.filter((b) => b.id !== draggedId);
    const reordered = [...sameCategory];
    const movedBm = { ...bm, tagId: targetTagId, sortOrder: newSortOrder };
    reordered.splice(Math.min(newSortOrder, reordered.length), 0, movedBm);

    const updatedIds = reordered.map((b) => b.id);
    const updatedItems = currentItems.map((b) => {
      const idx = updatedIds.indexOf(b.id);
      if (idx !== -1) {
        return { ...b, tagId: targetTagId, tag: movedBm.tag, sortOrder: idx };
      }
      return b;
    });

    setItems(updatedItems);

    try {
      await moveBookmark(draggedId, targetTagId, newSortOrder, { skipRevalidate: true });
      await reorderBookmarks(updatedIds, { skipRevalidate: true });
    } catch {
      setItems(currentItems);
    }
  }, []);

  const handleTagModalClose = useCallback(() => {
    setIsTagModalOpen(false);
    router.refresh();
  }, [router]);

  const handleAddModalSuccess = useCallback(() => {
    setIsAddModalOpen(false);
    router.refresh();
  }, [router]);

  const handleEditModalSuccess = useCallback(
    (updated: {
      url: string;
      title: string;
      memo: string;
      ogImage?: string;
      tagId?: string | null;
    }) => {
      const id = editingBookmarkId;
      if (id) {
        const newTag = updated.tagId
          ? (allTagsState.find((t) => t.id === updated.tagId) ?? null)
          : null;
        setItems((prev) =>
          prev.map((bm) =>
            bm.id === id
              ? {
                  ...bm,
                  url: updated.url,
                  title: updated.title,
                  memo: updated.memo || null,
                  ogImage: updated.ogImage ?? bm.ogImage,
                  tagId: updated.tagId ?? null,
                  tag: newTag,
                }
              : bm,
          ),
        );
      }
      setEditingBookmarkId(null);
      router.refresh();
    },
    [router, editingBookmarkId, allTagsState],
  );

  const activeBookmark = activeId ? items.find((b) => b.id === activeId) : null;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-bold text-zinc-900">ブックマーク一覧</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIsTagModalOpen(true)}
            className="cursor-pointer rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            カテゴリ管理
          </button>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="cursor-pointer rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            追加
          </button>
        </div>
      </div>

      <input
        type="search"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="タイトル・URL・メモで検索"
        aria-label="ブックマークを検索"
        className="mb-4 w-full rounded-md border border-zinc-300 px-4 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
      />

      {filteredItems.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 py-12 text-center text-sm text-zinc-500">
          {items.length === 0 ? "まだブックマークがありません" : "該当するブックマークがありません"}
        </div>
      ) : mounted ? (
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={groupedBookmarks.map((g) => `category-${g.key}`)}
            strategy={verticalListSortingStrategy}
          >
            {groupedBookmarks.map((group) => (
              <CategoryGroup
                key={group.key}
                categoryKey={group.key}
                tag={group.tag}
                bookmarks={group.bookmarks}
                isSearching={isSearching}
                onEdit={(bm) => setEditingBookmarkId(bm.id)}
                onDelete={handleDelete}
              />
            ))}
          </SortableContext>
          <DragOverlay>
            {activeBookmark && (
              <div className="flex items-center gap-3 rounded-lg border-2 border-blue-400 bg-white px-4 py-3 shadow-lg">
                <span className="shrink-0 cursor-grabbing text-zinc-400">
                  <DragHandleIcon />
                </span>
                <BookmarkItemContent bm={activeBookmark} onEdit={() => {}} onDelete={() => {}} />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      ) : (
        <div>
          {groupedBookmarks.map((group) => (
            <div key={group.key} className="mb-6">
              <div className="mb-2 flex items-center gap-2 border-b border-zinc-200 pb-1.5">
                <span
                  className={`inline-block h-2.5 w-2.5 rounded-full ${
                    group.tag ? getTagColor(group.tag.name).activeBg : "bg-zinc-400"
                  }`}
                />
                <span
                  className={`text-sm font-medium ${group.tag ? "text-zinc-900" : "text-zinc-500"}`}
                >
                  {group.tag ? group.tag.name : "未分類"}
                </span>
                <span className="text-xs text-zinc-400">{group.bookmarks.length}</span>
              </div>
              <ul className="flex flex-col gap-2 pl-5">
                {group.bookmarks.map((bm) => (
                  <li
                    key={bm.id}
                    className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3"
                  >
                    <BookmarkItemContent
                      bm={bm}
                      onEdit={(b) => setEditingBookmarkId(b.id)}
                      onDelete={handleDelete}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
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

      {isTagModalOpen && (
        <TagManagementModal
          initialTags={tagsWithCountState}
          onClose={handleTagModalClose}
          onCreateTag={createTag}
          onDeleteTag={deleteTag}
        />
      )}

      {isAddModalOpen && (
        <BookmarkAddModal
          availableTags={allTagsState}
          action={createBookmark}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={handleAddModalSuccess}
        />
      )}

      {editingBookmarkId &&
        (() => {
          const bm = items.find((b) => b.id === editingBookmarkId);
          if (!bm) return null;
          return (
            <BookmarkEditModal
              availableTags={allTagsState}
              defaultValues={{
                url: bm.url,
                title: bm.title,
                memo: bm.memo ?? "",
                ogImage: bm.ogImage ?? undefined,
                tagId: bm.tagId,
              }}
              action={updateBookmark.bind(null, editingBookmarkId)}
              onClose={() => setEditingBookmarkId(null)}
              onSuccess={handleEditModalSuccess}
            />
          );
        })()}
    </div>
  );
}
