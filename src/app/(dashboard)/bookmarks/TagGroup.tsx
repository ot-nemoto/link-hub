"use client";

import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import { writeCollapsedCookie } from "@/lib/collapsed-cookie";
import { groupByConsecutiveDomain } from "@/lib/domain-groups";
import { getTagColor } from "@/lib/tag-colors";
import { DragHandleIcon } from "./DragHandleIcon";
import { GlobeIcon } from "./GlobeIcon";
import { SortableBookmarkItem } from "./SortableBookmarkItem";
import { TagDropZone } from "./TagDropZone";
import { TagGroupHeader } from "./TagGroupHeader";
import type { Bookmark, TagItem } from "./types";

export function TagGroup({
  tagKey,
  tag,
  bookmarks,
  isSearching,
  initialCollapsed,
  onEdit,
  onDelete,
}: {
  tagKey: string;
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
    id: `tag-${tagKey}`,
    disabled: !isSortable,
    data: { type: "tag" },
  });

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      writeCollapsedCookie(tagKey, next);
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
      id={`tag-${tagKey}`}
      className={`mb-6 scroll-mt-56 border-l-4 pl-3 ${color ? color.border : "border-zinc-300"}`}
    >
      <TagGroupHeader
        tag={tag}
        count={bookmarks.length}
        collapsed={collapsed}
        onToggle={toggleCollapsed}
        dragHandle={
          isSortable ? (
            <button
              type="button"
              {...attributes}
              {...listeners}
              className={`shrink-0 cursor-grab opacity-60 hover:opacity-100 active:cursor-grabbing ${color ? color.text : "text-zinc-500"}`}
              aria-label="ドラッグしてタグを並び替え"
            >
              <DragHandleIcon />
            </button>
          ) : undefined
        }
      />

      {!collapsed && (
        <div className="pl-5">
          <SortableContext
            items={[...bookmarks.map((b) => b.id), `drop-zone-${tagKey}`]}
            strategy={verticalListSortingStrategy}
          >
            <ul className="flex flex-col gap-2">
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
                  />
                ));
              })}
              <TagDropZone tagKey={tagKey} />
            </ul>
          </SortableContext>
        </div>
      )}
    </div>
  );
}
