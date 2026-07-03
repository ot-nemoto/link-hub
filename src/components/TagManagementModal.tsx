"use client";

import { useEffect, useRef, useState } from "react";
import { getTagColor } from "@/lib/tag-colors";

type Tag = { id: string; name: string; bookmarkCount: number };

type TagResult = { tag?: { id: string; name: string }; conflict?: boolean; error?: string };

type Props = {
  initialTags: Tag[];
  onClose: () => void;
  onCreateTag: (name: string) => Promise<TagResult>;
  onUpdateTag: (id: string, name: string) => Promise<TagResult>;
  onDeleteTag: (id: string) => Promise<{ error?: string }>;
};

export function TagManagementModal({
  initialTags,
  onClose,
  onCreateTag,
  onUpdateTag,
  onDeleteTag,
}: Props) {
  const [tags, setTags] = useState<Tag[]>(initialTags);
  const [inputValue, setInputValue] = useState("");
  const [creating, setCreating] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // capture フェーズで拾い、伝播を止めて overlay/input の重複ハンドラより先に処理する。
    // 編集中はキャンセル（モーダルは閉じない）、それ以外は閉じる。
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      if (editingId) {
        setEditingId(null);
        setEditValue("");
        setError("");
      } else {
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [onClose, editingId]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (editingId) editInputRef.current?.focus();
  }, [editingId]);

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
        setError("同名のカテゴリが既に存在します");
        return;
      }
      if (result.error || !result.tag) {
        setError(result.error ?? "カテゴリの作成に失敗しました");
        return;
      }
      const newTag = result.tag;
      setTags((prev) =>
        [...prev, { ...newTag, bookmarkCount: 0 }].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setInputValue("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "カテゴリの作成に失敗しました");
    } finally {
      setCreating(false);
      inputRef.current?.focus();
    }
  }

  function handleStartEdit(tag: Tag) {
    setEditingId(tag.id);
    setEditValue(tag.name);
    setError("");
  }

  function handleCancelEdit() {
    setEditingId(null);
    setEditValue("");
    setError("");
  }

  async function handleSaveEdit(id: string) {
    const name = editValue.trim();
    if (!name) return;

    setSavingId(id);
    setError("");
    try {
      const result = await onUpdateTag(id, name);
      if (result.conflict) {
        setError("同名のカテゴリが既に存在します");
        return;
      }
      if (result.error || !result.tag) {
        setError(result.error ?? "カテゴリの更新に失敗しました");
        return;
      }
      const updated = result.tag;
      setTags((prev) => prev.map((t) => (t.id === id ? { ...t, name: updated.name } : t)));
      setEditingId(null);
      setEditValue("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "カテゴリの更新に失敗しました");
    } finally {
      setSavingId(null);
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
      setError(e instanceof Error ? e.message : "カテゴリの削除に失敗しました");
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
      aria-label="カテゴリ管理"
      onClick={handleOverlayClick}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    >
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-zinc-900">カテゴリ管理</h2>
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
            placeholder="新しいカテゴリ名"
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
            カテゴリがありません
          </div>
        ) : (
          <ul className="max-h-80 overflow-y-auto divide-y divide-zinc-100 rounded-lg border border-zinc-200">
            {tags.map((tag) => {
              const color = getTagColor(tag.name);
              const isEditing = editingId === tag.id;
              const isSaving = savingId === tag.id;
              return (
                <li
                  key={tag.id}
                  className="flex items-center justify-between gap-2 bg-white px-4 py-3 hover:bg-zinc-50"
                >
                  {isEditing ? (
                    <>
                      <input
                        ref={editInputRef}
                        type="text"
                        value={editValue}
                        onChange={(e) => {
                          setEditValue(e.target.value);
                          setError("");
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleSaveEdit(tag.id);
                          }
                        }}
                        maxLength={50}
                        disabled={isSaving}
                        className="min-w-0 flex-1 rounded-md border border-zinc-300 px-3 py-1 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:opacity-50"
                      />
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(tag.id)}
                          disabled={isSaving || editValue.trim().length === 0}
                          className="cursor-pointer rounded-md bg-zinc-900 px-3 py-1 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
                        >
                          {isSaving ? "保存中..." : "保存"}
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          disabled={isSaving}
                          className="cursor-pointer rounded border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                        >
                          キャンセル
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${color.bg} ${color.text}`}
                        >
                          {tag.name}
                        </span>
                        <span className="text-xs text-zinc-400">{tag.bookmarkCount}件</span>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(tag)}
                          className="cursor-pointer rounded border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                        >
                          編集
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(tag.id)}
                          disabled={deletingIds.has(tag.id)}
                          className="cursor-pointer rounded border border-red-300 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          {deletingIds.has(tag.id) ? "削除中..." : "削除"}
                        </button>
                      </div>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
