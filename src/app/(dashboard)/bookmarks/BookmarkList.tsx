"use client";

import { DndContext, DragOverlay } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { BookmarkAddModal } from "@/components/BookmarkAddModal";
import { BookmarkEditModal } from "@/components/BookmarkEditModal";
import { TagManagementModal } from "@/components/TagManagementModal";
import { groupByConsecutiveDomain } from "@/lib/domain-groups";
import { getTagColor } from "@/lib/tag-colors";
import {
  createBookmark,
  createTag,
  deleteBookmark,
  deleteTag,
  emptyTrash,
  restoreBookmark,
  updateBookmark,
  updateTag,
} from "./actions";
import { BookmarkItemContent } from "./BookmarkItemContent";
import { DragHandleIcon } from "./DragHandleIcon";
import { GlobeIcon } from "./GlobeIcon";
import { SearchIcon } from "./SearchIcon";
import { TagGroup } from "./TagGroup";
import { TRASH_COLLAPSE_KEY, TrashGroup } from "./TrashGroup";
import type { Bookmark, TagItem, TagWithCount } from "./types";
import { UNCATEGORIZED_KEY } from "./types";
import { useDragAndDrop } from "./useDragAndDrop";

export function BookmarkList({
  bookmarks: initial,
  deletedBookmarks,
  allTags,
  tagsWithCount,
  initialCollapsed,
}: {
  bookmarks: Bookmark[];
  deletedBookmarks: Bookmark[];
  allTags: TagItem[];
  tagsWithCount: TagWithCount[];
  initialCollapsed: Record<string, boolean>;
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState<Bookmark[]>(initial);
  const [deletedItems, setDeletedItems] = useState<Bookmark[]>(deletedBookmarks);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [allTagsState, setAllTagsState] = useState<TagItem[]>(allTags);
  const [tagsWithCountState, setTagsWithCountState] = useState<TagWithCount[]>(tagsWithCount);
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBookmarkId, setEditingBookmarkId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);
  useEffect(() => {
    setItems(initial);
  }, [initial]);
  useEffect(() => {
    setDeletedItems(deletedBookmarks);
  }, [deletedBookmarks]);
  useEffect(() => {
    setAllTagsState(allTags);
  }, [allTags]);
  useEffect(() => {
    setTagsWithCountState(tagsWithCount);
  }, [tagsWithCount]);

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

  const addProcessing = useCallback((id: string) => {
    setProcessingIds((prev) => new Set(prev).add(id));
  }, []);
  const removeProcessing = useCallback((id: string) => {
    setProcessingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const handleDelete = useCallback(
    async (bm: Bookmark) => {
      // ソフトデリート: アクティブ一覧から外し、楽観的にゴミ箱の先頭へ移す
      addProcessing(bm.id);
      setItems((prev) => prev.filter((b) => b.id !== bm.id));
      setDeletedItems((prev) => [bm, ...prev]);

      const rollback = () => {
        setDeletedItems((prev) => prev.filter((b) => b.id !== bm.id));
        setItems((prev) => [...prev, bm]);
      };

      try {
        const result = await deleteBookmark(bm.id, {});
        if (result?.error) {
          rollback();
          return;
        }
        router.refresh();
      } catch {
        rollback();
      } finally {
        removeProcessing(bm.id);
      }
    },
    [router, addProcessing, removeProcessing],
  );

  const handleRestore = useCallback(
    async (bm: Bookmark) => {
      // 削除リクエスト処理中の bm は復元不可（TrashGroup 側でボタンを disable）
      if (processingIds.has(bm.id)) return;
      addProcessing(bm.id);
      setDeletedItems((prev) => prev.filter((b) => b.id !== bm.id));
      setItems((prev) => [...prev, bm]);

      const rollback = () => {
        setItems((prev) => prev.filter((b) => b.id !== bm.id));
        setDeletedItems((prev) => [bm, ...prev]);
      };

      try {
        const result = await restoreBookmark(bm.id);
        if (result?.error) {
          rollback();
          return;
        }
        router.refresh();
      } catch {
        rollback();
      } finally {
        removeProcessing(bm.id);
      }
    },
    [router, processingIds, addProcessing, removeProcessing],
  );

  const handleEmptyTrash = useCallback(async () => {
    if (
      !window.confirm(
        "ゴミ箱内のブックマークをすべて完全に削除します。この操作は取り消せません。よろしいですか？",
      )
    ) {
      return;
    }
    const prevDeleted = deletedItems;
    setDeletedItems([]);

    try {
      const result = await emptyTrash();
      if (result?.error) {
        setDeletedItems(prevDeleted);
        return;
      }
      router.refresh();
    } catch {
      setDeletedItems(prevDeleted);
    }
  }, [router, deletedItems]);

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
      hideOgImage?: boolean;
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
                  hideOgImage: updated.hideOgImage ?? bm.hideOgImage,
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

  const scrollToTag = useCallback((key: string) => {
    document.getElementById(`tag-${key}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <div>
      <div className="sticky top-20 z-10 mb-5 rounded-2xl border border-zinc-200 bg-white/95 p-4 shadow-sm backdrop-blur-sm">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                <SearchIcon />
              </span>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="タイトル・URL・メモで検索"
                aria-label="ブックマークを検索"
                className="w-full rounded-full border border-zinc-300 bg-zinc-100 py-2 pl-9 pr-4 text-sm focus:border-zinc-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-500"
              />
            </div>
            <button
              type="button"
              onClick={() => setIsTagModalOpen(true)}
              className="shrink-0 cursor-pointer rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              タグ管理
            </button>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="shrink-0 cursor-pointer rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
            >
              追加
            </button>
          </div>
          {groupedBookmarks.length > 1 && (
            <nav
              className="scrollbar-hide flex gap-1.5 overflow-x-auto"
              aria-label="タグナビゲーション"
            >
              {groupedBookmarks.map((group) => {
                const color = group.tag ? getTagColor(group.tag.name) : null;
                return (
                  <button
                    key={group.key}
                    type="button"
                    onClick={() => scrollToTag(group.key)}
                    className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-600 transition-colors hover:border-zinc-400 hover:bg-zinc-50"
                  >
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${color ? color.activeBg : "bg-zinc-400"}`}
                    />
                    {group.tag ? group.tag.name : "未分類"}
                    <span className="text-zinc-400">{group.bookmarks.length}</span>
                  </button>
                );
              })}
            </nav>
          )}
        </div>
      </div>

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
            items={groupedBookmarks.map((g) => `tag-${g.key}`)}
            strategy={verticalListSortingStrategy}
          >
            {groupedBookmarks.map((group) => (
              <TagGroup
                key={group.key}
                tagKey={group.key}
                tag={group.tag}
                bookmarks={group.bookmarks}
                isSearching={isSearching}
                initialCollapsed={initialCollapsed[group.key] ?? false}
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
          {groupedBookmarks.map((group) => {
            const collapsed = initialCollapsed[group.key] ?? false;
            const color = group.tag ? getTagColor(group.tag.name) : null;
            const isSortable = group.tag !== null;
            const segments = groupByConsecutiveDomain(group.bookmarks);
            return (
              <div key={group.key} id={`tag-${group.key}`} className="mb-6 scroll-mt-56">
                <div className="mb-2 flex w-full items-center gap-2 border-b border-zinc-200 pb-1.5">
                  {isSortable && (
                    <span className="shrink-0 text-zinc-400">
                      <DragHandleIcon />
                    </span>
                  )}
                  <div className="flex flex-1 items-center gap-2">
                    <span
                      className={`inline-block h-2.5 w-2.5 rounded-full ${color ? color.activeBg : "bg-zinc-400"}`}
                    />
                    <span
                      className={`text-sm font-medium ${group.tag ? "text-zinc-900" : "text-zinc-500"}`}
                    >
                      {group.tag ? group.tag.name : "未分類"}
                    </span>
                    <span className="text-xs text-zinc-400">{group.bookmarks.length}</span>
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
                  </div>
                </div>
                {!collapsed && (
                  <ul className="flex flex-col gap-2 pl-5">
                    {segments.flatMap((seg) => {
                      if (seg.bookmarks.length >= 2) {
                        return [
                          <li
                            key={`domain-${seg.bookmarks[0].id}`}
                            className="flex flex-col gap-2 border-l-4 border-zinc-400 pl-4"
                          >
                            <div className="flex items-center gap-2 text-xs text-zinc-500">
                              <GlobeIcon />
                              <span className="font-medium">{seg.domain}</span>
                              <span className="text-zinc-400">{seg.bookmarks.length}</span>
                            </div>
                            <ul className="flex flex-col gap-2">
                              {seg.bookmarks.map((bm) => (
                                <li
                                  key={bm.id}
                                  className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 hover:border-zinc-400 hover:bg-zinc-50"
                                >
                                  <span className="shrink-0 text-zinc-400">
                                    <DragHandleIcon />
                                  </span>
                                  <BookmarkItemContent
                                    bm={bm}
                                    onEdit={(b) => setEditingBookmarkId(b.id)}
                                    onDelete={handleDelete}
                                  />
                                </li>
                              ))}
                            </ul>
                          </li>,
                        ];
                      }
                      return seg.bookmarks.map((bm) => (
                        <li
                          key={bm.id}
                          className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 hover:border-zinc-400 hover:bg-zinc-50"
                        >
                          <span className="shrink-0 text-zinc-400">
                            <DragHandleIcon />
                          </span>
                          <BookmarkItemContent
                            bm={bm}
                            onEdit={(b) => setEditingBookmarkId(b.id)}
                            onDelete={handleDelete}
                          />
                        </li>
                      ));
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}

      {deletedItems.length > 0 && (
        <TrashGroup
          bookmarks={deletedItems}
          initialCollapsed={initialCollapsed[TRASH_COLLAPSE_KEY] ?? true}
          processingIds={processingIds}
          onRestore={handleRestore}
          onEmptyTrash={handleEmptyTrash}
        />
      )}

      {isTagModalOpen && (
        <TagManagementModal
          initialTags={tagsWithCountState}
          onClose={handleTagModalClose}
          onCreateTag={createTag}
          onUpdateTag={updateTag}
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
                hideOgImage: bm.hideOgImage,
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
