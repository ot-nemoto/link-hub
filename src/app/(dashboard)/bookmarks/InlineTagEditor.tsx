"use client";

import { useState } from "react";

import { updateBookmarkTags } from "./actions";
import { TagInput, type Tag } from "./TagInput";

type Props = {
  bookmarkId: string;
  allTags: Tag[];
  currentTagIds: string[];
  onSave: (tagIds: string[], newTags: Tag[]) => void;
  onCancel: () => void;
};

export function InlineTagEditor({
  bookmarkId,
  allTags,
  currentTagIds,
  onSave,
  onCancel,
}: Props) {
  const [tagIds, setTagIds] = useState(currentTagIds);
  const [localNewTags, setLocalNewTags] = useState<Tag[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // TagInput で新規作成したタグを allTags にマージして候補に含める
  const mergedTags = [
    ...allTags,
    ...localNewTags.filter((t) => !allTags.find((a) => a.id === t.id)),
  ];

  function handleChange(ids: string[], newTag?: Tag) {
    setTagIds(ids);
    if (newTag && !allTags.find((t) => t.id === newTag.id)) {
      setLocalNewTags((prev) => [...prev, newTag]);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    const result = await updateBookmarkTags(bookmarkId, tagIds);
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onSave(tagIds, localNewTags);
  }

  return (
    <div className="mt-2 rounded border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900">
      <TagInput availableTags={mergedTags} selectedTagIds={tagIds} onChange={handleChange} />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "保存中..." : "保存"}
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
