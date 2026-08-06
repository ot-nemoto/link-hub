import { useSortable } from "@dnd-kit/sortable";
import { UNCATEGORIZED_KEY } from "./types";

export function TagDropZone({ tagKey }: { tagKey: string }) {
  const { setNodeRef, isOver } = useSortable({
    id: `drop-zone-${tagKey}`,
    data: { type: "drop-zone", tagId: tagKey === UNCATEGORIZED_KEY ? null : tagKey },
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
