"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

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
        [...prev, { ...newTag, bookmarkCount: 0 }].sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      );
      setInputValue("");
      router.refresh();
    } finally {
      setCreating(false);
      // setCreating(false) による再レンダリング後にフォーカスを当てる
      setTimeout(() => inputRef.current?.focus(), 0);
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
          className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={creating || inputValue.trim().length === 0}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {creating ? "作成中..." : "作成"}
        </button>
      </form>

      {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

      {tags.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 py-16 text-center text-gray-500 dark:border-gray-600 dark:text-gray-400">
          タグがありません
        </div>
      ) : (
        <ul className="divide-y divide-gray-200 rounded-lg border dark:divide-gray-700 dark:border-gray-700">
          {tags.map((tag) => (
            <li
              key={tag.id}
              className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-800 dark:text-gray-100">{tag.name}</span>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {tag.bookmarkCount}件
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(tag.id)}
                disabled={deletingIds.has(tag.id)}
                className="rounded border border-red-300 px-3 py-1 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
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
