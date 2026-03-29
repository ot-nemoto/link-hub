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
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              active
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-gray-300 bg-white text-gray-600 hover:border-blue-400 hover:text-blue-600 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-blue-400 dark:hover:text-blue-400"
            }`}
          >
            {tag.name}
          </button>
        );
      })}
      <button
        type="button"
        onClick={() => toggle(UNTAGGED_ID)}
        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
          selectedTagIds.includes(UNTAGGED_ID)
            ? "border-gray-600 bg-gray-600 text-white"
            : "border-gray-300 bg-white text-gray-600 hover:border-gray-500 hover:text-gray-800 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-gray-400 dark:hover:text-gray-200"
        }`}
      >
        タグなし
      </button>
    </div>
  );
}

export { UNTAGGED_ID };
