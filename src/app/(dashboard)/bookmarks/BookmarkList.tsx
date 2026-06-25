"use client";

import { DndContext, DragOverlay } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
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
  updateBookmark,
} from "./actions";
import { BookmarkItemContent } from "./BookmarkItemContent";
import { CategoryGroup } from "./CategoryGroup";
import { DragHandleIcon } from "./DragHandleIcon";
import type { Bookmark, PendingDelete, TagItem, TagWithCount } from "./types";
import { UNCATEGORIZED_KEY } from "./types";
import { UndoSnackbar } from "./UndoSnackbar";
import { useDragAndDrop } from "./useDragAndDrop";

const UNDO_TIMEOUT_MS = 5000;

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

  const {
    sensors,
    collisionDetection,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    activeBookmark,
  } = useDragAndDrop({ items, setItems, allTagsState, setAllTagsState });

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
