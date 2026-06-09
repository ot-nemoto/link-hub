"use client";

import { useState } from "react";

import type { TagFilterItem } from "./TagFilter";

type Props = {
  allTags: TagFilterItem[];
  saving: boolean;
  error?: string;
  onSave: (tagIds: string[]) => void;
  onCancel: () => void;
};

export function BulkTagPanel({ allTags, saving, error, onSave, onCancel }: Props) {
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  function toggle(id: string) {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  }

  return (
    <div className="mb-3 rounded-lg bg-white p-4 shadow-sm border border-zinc-200">
      <p className="mb-2 text-sm font-medium text-zinc-700">
        追加するタグを選択
      </p>
      {allTags.length === 0 ? (
        <p className="mb-3 text-sm text-zinc-500">
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
        </div>
      )}
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onSave(selectedTagIds)}
          disabled={saving || selectedTagIds.length === 0}
          className="cursor-pointer rounded px-3 py-1 text-xs font-medium bg-zinc-900 text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          {saving ? "追加中..." : "追加"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="cursor-pointer rounded px-3 py-1 text-xs font-medium bg-zinc-100 text-zinc-700 hover:bg-zinc-200 disabled:opacity-50"
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}
