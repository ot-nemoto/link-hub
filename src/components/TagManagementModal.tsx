"use client";

import { useEffect, useRef, useState } from "react";
import { getTagColor } from "@/lib/tag-colors";

type Tag = { id: string; name: string; bookmarkCount: number };

type Props = {
  initialTags: Tag[];
  onClose: () => void;
  onCreateTag: (
    name: string,
  ) => Promise<{ tag?: { id: string; name: string }; conflict?: boolean; error?: string }>;
  onDeleteTag: (id: string) => Promise<{ error?: string }>;
};

export function TagManagementModal({ initialTags, onClose, onCreateTag, onDeleteTag }: Props) {
  const [tags, setTags] = useState<Tag[]>(initialTags);
  const [inputValue, setInputValue] = useState("");
  const [creating, setCreating] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose();
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const name = inputValue.trim();
    if (!name) return;

    setCreating(true);
    setError("");
    try {
      const result = await onCreateTag(name);
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "タグの作成に失敗しました");
    } finally {
      setCreating(false);
      inputRef.current?.focus();
    }
  }

  async function handleDelete(id: string) {
    setDeletingIds((prev) => new Set(prev).add(id));
    try {
      const result = await onDeleteTag(id);
      if (result.error) {
        setError(result.error);
        return;
      }
      setTags((prev) => prev.filter((t) => t.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "タグの削除に失敗しました");
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label="タグ管理"
      onClick={handleOverlayClick}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    >
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-zinc-900">タグ管理</h2>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
            aria-label="閉じる"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleCreate} className="mb-4 flex gap-2">
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

        {error && (
          <p className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
        )}

        {tags.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 py-12 text-center text-sm text-zinc-500">
            タグがありません
          </div>
        ) : (
          <ul className="max-h-80 overflow-y-auto divide-y divide-zinc-100 rounded-lg border border-zinc-200">
            {tags.map((tag) => {
              const color = getTagColor(tag.name);
              return (
                <li
                  key={tag.id}
                  className="flex items-center justify-between bg-white px-4 py-3 hover:bg-zinc-50"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${color.bg} ${color.text}`}
                    >
                      {tag.name}
                    </span>
                    <span className="text-xs text-zinc-400">{tag.bookmarkCount}件</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(tag.id)}
                    disabled={deletingIds.has(tag.id)}
                    className="cursor-pointer rounded border border-red-300 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    {deletingIds.has(tag.id) ? "削除中..." : "削除"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
