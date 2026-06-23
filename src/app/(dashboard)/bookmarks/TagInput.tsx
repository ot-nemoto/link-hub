"use client";

import { useRef, useState } from "react";

import { createTag } from "./actions";

export type Tag = { id: string; name: string };

type Props = {
  inputId?: string;
  availableTags: Tag[];
  selectedTagIds: string[];
  onChange: (tagIds: string[], newTag?: Tag) => void;
};

export function TagInput({ inputId, availableTags, selectedTagIds, onChange }: Props) {
  const [inputValue, setInputValue] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedTags = availableTags.filter((t) => selectedTagIds.includes(t.id));
  const trimmed = inputValue.trim();
  const suggestions = trimmed
    ? availableTags.filter(
        (t) =>
          t.name.toLowerCase().includes(trimmed.toLowerCase()) && !selectedTagIds.includes(t.id),
      )
    : availableTags.filter((t) => !selectedTagIds.includes(t.id));
  const exactMatch = availableTags.find((t) => t.name.toLowerCase() === trimmed.toLowerCase());
  const canCreate = trimmed.length > 0 && trimmed.length <= 50 && !exactMatch;

  function removeTag(id: string) {
    onChange(selectedTagIds.filter((tid) => tid !== id));
  }

  function selectTag(tag: Tag) {
    if (!selectedTagIds.includes(tag.id)) {
      onChange([...selectedTagIds, tag.id]);
    }
    setInputValue("");
    inputRef.current?.focus();
  }

  async function createAndSelectTag(name: string) {
    setCreating(true);
    setError("");
    try {
      const result = await createTag(name);
      if (result.conflict && result.tag) {
        const existsLocally = availableTags.find((t) => t.id === result.tag?.id);
        if (existsLocally) {
          selectTag(existsLocally);
        } else {
          onChange([...selectedTagIds, result.tag.id], result.tag);
          setInputValue("");
          inputRef.current?.focus();
        }
        return;
      }
      if (result.error || !result.tag) {
        setError(result.error ?? "タグの作成に失敗しました");
        return;
      }
      onChange([...selectedTagIds, result.tag.id], result.tag);
      setInputValue("");
      inputRef.current?.focus();
    } finally {
      setCreating(false);
    }
  }

  async function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (suggestions.length > 0 && !canCreate) {
        selectTag(suggestions[0]);
      } else if (exactMatch && !selectedTagIds.includes(exactMatch.id)) {
        selectTag(exactMatch);
      } else if (canCreate) {
        await createAndSelectTag(trimmed);
      }
    }
  }

  const showDropdown = focused && (suggestions.length > 0 || canCreate);

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1">
        {selectedTags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500"
          >
            {tag.name}
            <button
              type="button"
              onClick={() => removeTag(tag.id)}
              className="cursor-pointer leading-none text-zinc-400 hover:text-zinc-600"
              aria-label={`${tag.name}を削除`}
            >
              ×
            </button>
          </span>
        ))}
      </div>

      <div className="relative">
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setError("");
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={handleKeyDown}
          disabled={creating}
          placeholder="タグを入力（Enter で追加）"
          className="block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:opacity-50"
        />

        {showDropdown && (
          <ul
            className="absolute z-10 mt-1 w-full rounded-md border border-zinc-200 bg-white shadow-sm"
            onMouseDown={(e) => e.preventDefault()}
          >
            {suggestions.map((tag) => (
              <li key={tag.id}>
                <button
                  type="button"
                  onClick={() => selectTag(tag)}
                  disabled={creating}
                  className="w-full cursor-pointer px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                >
                  {tag.name}
                </button>
              </li>
            ))}
            {canCreate && (
              <li>
                <button
                  type="button"
                  onClick={() => createAndSelectTag(trimmed)}
                  disabled={creating}
                  className="w-full cursor-pointer px-3 py-2 text-left text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-50"
                >
                  「{trimmed}」を新規作成
                </button>
              </li>
            )}
          </ul>
        )}
      </div>

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
