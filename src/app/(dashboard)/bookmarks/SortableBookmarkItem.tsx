import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { BookmarkItemContent } from "./BookmarkItemContent";
import { DragHandleIcon } from "./DragHandleIcon";
import type { Bookmark } from "./types";

export function SortableBookmarkItem({
  bm,
  isSearching,
  onEdit,
  onDelete,
  domainLabel,
}: {
  bm: Bookmark;
  isSearching: boolean;
  onEdit: (bm: Bookmark) => void;
  onDelete: (bm: Bookmark) => void;
  domainLabel?: string;
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
      <BookmarkItemContent bm={bm} onEdit={onEdit} onDelete={onDelete} domainLabel={domainLabel} />
    </li>
  );
}
