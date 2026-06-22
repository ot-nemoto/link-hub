"use client";

import { useState } from "react";

import { updateBookmarkTags } from "./actions";
import { type Tag, TagInput } from "./TagInput";

type Props = {
  bookmarkId: string;
  allTags: Tag[];
  currentTagIds: string[];
  onSave: (tagIds: string[], newTags: Tag[]) => void;
  onCancel: () => void;
};

export function InlineTagEditor({ bookmarkId, allTags, currentTagIds, onSave, onCancel }: Props) {
  const [tagIds, setTagIds] = useState(currentTagIds);
  const [localNewTags, setLocalNewTags] = useState<Tag[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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
    <div className="mt-2 rounded-md border border-zinc-200 bg-zinc-50 p-3">
      <TagInput availableTags={mergedTags} selectedTagIds={tagIds} onChange={handleChange} />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="cursor-pointer rounded px-3 py-1 text-xs font-medium bg-zinc-900 text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          {saving ? "保存中..." : "保存"}
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
