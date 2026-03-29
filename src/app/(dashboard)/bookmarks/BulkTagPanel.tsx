"use client";

import { useState } from "react";

import { type TagFilterItem } from "./TagFilter";

type Props = {
  allTags: TagFilterItem[];
  saving: boolean;
  onSave: (tagIds: string[]) => void;
  onCancel: () => void;
};

export function BulkTagPanel({ allTags, saving, onSave, onCancel }: Props) {
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  function toggle(id: string) {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  }

  return (
    <div className="mb-3 rounded border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950">
      <p className="mb-2 text-xs font-medium text-gray-600 dark:text-gray-400">
        追加するタグを選択
      </p>
      {allTags.length === 0 ? (
        <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
          タグがありません。先にタグを作成してください。
        </p>
      ) : (
        <div className="mb-3 flex flex-wrap gap-2">
          {allTags.map((tag) => {
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
        </div>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onSave(selectedTagIds)}
          disabled={saving || selectedTagIds.length === 0}
          className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "追加中..." : "追加"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}
