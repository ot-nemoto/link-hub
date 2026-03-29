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
          t.name.toLowerCase().includes(trimmed.toLowerCase()) &&
          !selectedTagIds.includes(t.id),
      )
    : availableTags.filter((t) => !selectedTagIds.includes(t.id));
  const exactMatch = availableTags.find(
    (t) => t.name.toLowerCase() === trimmed.toLowerCase(),
  );
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
        const existing = availableTags.find((t) => t.id === result.tag!.id) ?? result.tag;
        selectTag(existing);
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
      <div className="flex flex-wrap gap-1 mb-2">
        {selectedTags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900 dark:text-blue-300"
          >
            {tag.name}
            <button
              type="button"
              onClick={() => removeTag(tag.id)}
              className="leading-none text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-200"
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
          className="block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400 disabled:opacity-50"
        />

        {showDropdown && (
          // onMouseDown で preventDefault することで、候補クリック時に input の blur を防ぐ
          <ul
            className="absolute z-10 mt-1 w-full rounded border border-gray-200 bg-white shadow dark:border-gray-700 dark:bg-gray-800"
            onMouseDown={(e) => e.preventDefault()}
          >
            {suggestions.map((tag) => (
              <li key={tag.id}>
                <button
                  type="button"
                  onClick={() => selectTag(tag)}
                  disabled={creating}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 disabled:opacity-50 dark:hover:bg-gray-700"
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
                  className="w-full px-3 py-2 text-left text-sm text-blue-600 hover:bg-gray-100 disabled:opacity-50 dark:text-blue-400 dark:hover:bg-gray-700"
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
