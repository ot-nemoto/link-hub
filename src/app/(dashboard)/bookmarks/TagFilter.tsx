"use client";

export type TagFilterItem = { id: string; name: string };

const UNTAGGED_ID = "__untagged__";

type Props = {
  tags: TagFilterItem[];
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
};

export function TagFilter({ tags, selectedTagIds, onChange }: Props) {
  if (tags.length === 0) return null;

  function toggle(id: string) {
    if (selectedTagIds.includes(id)) {
      onChange(selectedTagIds.filter((tid) => tid !== id));
    } else {
      onChange([...selectedTagIds, id]);
    }
  }

  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {tags.map((tag) => {
        const active = selectedTagIds.includes(tag.id);
        return (
          <button
            key={tag.id}
            type="button"
            onClick={() => toggle(tag.id)}
            className={`cursor-pointer rounded-full px-3 py-1 text-sm font-medium ${
              active
                ? "bg-zinc-900 text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            {tag.name}
          </button>
        );
      })}
      <button
        type="button"
        onClick={() => toggle(UNTAGGED_ID)}
        className={`cursor-pointer rounded-md px-3 py-1 text-sm font-medium ${
          selectedTagIds.includes(UNTAGGED_ID)
            ? "bg-zinc-900 text-white"
            : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
        }`}
      >
        タグなし
      </button>
      {selectedTagIds.length > 0 && (
        <button
          type="button"
          onClick={() => onChange([])}
          className="cursor-pointer rounded-md border border-red-300 px-3 py-1 text-sm font-medium text-red-600 hover:bg-red-50"
        >
          全解除
        </button>
      )}
    </div>
  );
}

export { UNTAGGED_ID };
