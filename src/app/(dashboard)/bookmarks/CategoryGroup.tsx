"use client";

import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import { writeCollapsedCookie } from "@/lib/collapsed-cookie";
import { groupByConsecutiveDomain } from "@/lib/domain-groups";
import { getTagColor } from "@/lib/tag-colors";
import { CategoryDropZone } from "./CategoryDropZone";
import { DragHandleIcon } from "./DragHandleIcon";
import { SortableBookmarkItem } from "./SortableBookmarkItem";
import type { Bookmark, TagItem } from "./types";

export function CategoryGroup({
  categoryKey,
  tag,
  bookmarks,
  isSearching,
  initialCollapsed,
  onEdit,
  onDelete,
}: {
  categoryKey: string;
  tag: TagItem | null;
  bookmarks: Bookmark[];
  isSearching: boolean;
  initialCollapsed: boolean;
  onEdit: (bm: Bookmark) => void;
  onDelete: (bm: Bookmark) => void;
}) {
  const [collapsed, setCollapsed] = useState<boolean>(initialCollapsed);
  const color = tag ? getTagColor(tag.name) : null;
  const isSortable = tag !== null;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `category-${categoryKey}`,
    disabled: !isSortable,
    data: { type: "category" },
  });

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      writeCollapsedCookie(categoryKey, next);
      return next;
    });
  };

  const segments = groupByConsecutiveDomain(bookmarks);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || undefined,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      id={`category-${categoryKey}`}
      className="mb-6 scroll-mt-28"
    >
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
          onClick={toggleCollapsed}
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
              {segments.flatMap((seg) => {
                if (seg.bookmarks.length >= 2) {
                  return [
                    <li
                      key={`domain-${seg.bookmarks[0].id}`}
                      className="flex flex-col gap-2 border-l-2 border-zinc-300 pl-3"
                    >
                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <span className="font-medium">{seg.domain}</span>
                        <span className="text-zinc-400">{seg.bookmarks.length}</span>
                      </div>
                      <ul className="flex flex-col gap-2">
                        {seg.bookmarks.map((bm) => (
                          <SortableBookmarkItem
                            key={bm.id}
                            bm={bm}
                            isSearching={isSearching}
                            onEdit={onEdit}
                            onDelete={onDelete}
                          />
                        ))}
                      </ul>
                    </li>,
                  ];
                }
                return seg.bookmarks.map((bm) => (
                  <SortableBookmarkItem
                    key={bm.id}
                    bm={bm}
                    isSearching={isSearching}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    domainLabel={seg.domain || undefined}
                  />
                ));
              })}
              <CategoryDropZone categoryKey={categoryKey} />
            </ul>
          </SortableContext>
        </div>
      )}
    </div>
  );
}
