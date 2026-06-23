"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { flushSync } from "react-dom";

import { createTag, deleteTag } from "../actions";

type Tag = { id: string; name: string; bookmarkCount: number };

export function TagsClient({ initialTags }: { initialTags: Tag[] }) {
  const router = useRouter();
  const [tags, setTags] = useState<Tag[]>(initialTags);
  const [inputValue, setInputValue] = useState("");
  const [creating, setCreating] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const name = inputValue.trim();
    if (!name) return;

    setCreating(true);
    setError("");
    try {
      const result = await createTag(name);
      if (result.conflict) {
        setError("同名のタグが既に存在します");
        return;
      }
      if (result.error || !result.tag) {
        setError(result.error ?? "タグの作成に失敗しました");
        return;
      }
      const newTag = result.tag;
      setTags((prev) =>
        [...prev, { ...newTag, bookmarkCount: 0 }].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setInputValue("");
    } finally {
      flushSync(() => setCreating(false));
      inputRef.current?.focus();
    }
  }

  async function handleDelete(id: string) {
    setDeletingIds((prev) => new Set(prev).add(id));
    try {
      const result = await deleteTag(id);
      if (result.error) {
        setError(result.error);
        return;
      }
      setTags((prev) => prev.filter((t) => t.id !== id));
      router.refresh();
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  return (
    <div>
      <form onSubmit={handleCreate} className="mb-6 flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setError("");
          }}
          placeholder="新しいタグ名"
          maxLength={50}
          disabled={creating}
          className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={creating || inputValue.trim().length === 0}
          className="cursor-pointer rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          {creating ? "作成中..." : "作成"}
        </button>
      </form>

      {error && <p className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

      {tags.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 py-16 text-center text-sm text-zinc-500">
          タグがありません
        </div>
      ) : (
        <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200">
          {tags.map((tag) => (
            <li
              key={tag.id}
              className="flex items-center justify-between px-4 py-3 bg-white hover:bg-zinc-50"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-900">{tag.name}</span>
                <span className="text-xs text-zinc-400">{tag.bookmarkCount}件</span>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(tag.id)}
                disabled={deletingIds.has(tag.id)}
                className="cursor-pointer rounded border border-red-300 px-3 py-1 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                {deletingIds.has(tag.id) ? "削除中..." : "削除"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
