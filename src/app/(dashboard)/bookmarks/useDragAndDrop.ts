import {
  type CollisionDetection,
  closestCenter,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useCallback, useEffect, useRef, useState } from "react";
import { moveBookmark, reorderBookmarks, reorderTags } from "./actions";
import type { Bookmark, TagItem } from "./types";

export function useDragAndDrop({
  items,
  setItems,
  allTagsState,
  setAllTagsState,
}: {
  items: Bookmark[];
  setItems: React.Dispatch<React.SetStateAction<Bookmark[]>>;
  allTagsState: TagItem[];
  setAllTagsState: React.Dispatch<React.SetStateAction<TagItem[]>>;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);

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

  const itemsRef = useRef<Bookmark[]>(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const allTagsRef = useRef<TagItem[]>(allTagsState);
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
    [allTagsState, setItems],
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
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
      const idToIndex = new Map(updatedIds.map((id, i) => [id, i]));
      const updatedItems = currentItems.map((b) => {
        const idx = idToIndex.get(b.id);
        if (idx !== undefined) {
          return { ...b, tagId: targetTagId, tag: movedBm.tag, sortOrder: idx };
        }
        return b;
      });

      setItems(updatedItems);

      try {
        const moveResult = await moveBookmark(draggedId, targetTagId, newSortOrder, {
          skipRevalidate: true,
        });
        if (moveResult.error) throw new Error(moveResult.error);
        const reorderResult = await reorderBookmarks(updatedIds, { skipRevalidate: true });
        if (reorderResult.error) throw new Error(reorderResult.error);
      } catch {
        setItems(currentItems);
      }
    },
    [setItems, setAllTagsState],
  );

  const activeBookmark = activeId ? items.find((b) => b.id === activeId) : null;

  return {
    sensors,
    collisionDetection,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    activeBookmark,
  };
}
