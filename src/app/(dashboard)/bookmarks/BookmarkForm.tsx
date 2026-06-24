"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { fetchOgp } from "./fetchOgp";
import { type Tag, TagInput } from "./TagInput";

type Props = {
  availableTags: Tag[];
  defaultValues?: {
    url: string;
    title: string;
    memo: string;
    ogImage?: string;
    tagIds?: string[];
  };
  action: (data: {
    url: string;
    title: string;
    memo: string;
    ogImage?: string;
    tagIds?: string[];
  }) => Promise<{ error?: string }>;
  onSuccess?: () => void;
  onCancel?: () => void;
};

export function BookmarkForm({ availableTags, defaultValues, action, onSuccess, onCancel }: Props) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState(defaultValues?.title ?? "");
  const [ogImage, setOgImage] = useState(defaultValues?.ogImage ?? "");
  const [fetchingOgp, setFetchingOgp] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(defaultValues?.tagIds ?? []);
  const [localTags, setLocalTags] = useState<Tag[]>(availableTags);

  function handleTagChange(ids: string[], newTag?: Tag) {
    setSelectedTagIds(ids);
    if (newTag && !localTags.some((t) => t.id === newTag.id)) {
      setLocalTags((prev) => [...prev, newTag]);
    }
  }

  const titleRef = useRef(title);
  const ogImageRef = useRef(ogImage);
  useEffect(() => {
    titleRef.current = title;
  }, [title]);
  useEffect(() => {
    ogImageRef.current = ogImage;
  }, [ogImage]);

  async function handleUrlBlur(e: React.FocusEvent<HTMLInputElement>) {
    const url = e.currentTarget.value.trim();
    if (!url) return;

    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return;
    } catch {
      return;
    }

    if (titleRef.current && ogImageRef.current) return;

    setFetchingOgp(true);
    const result = await fetchOgp(url);
    setFetchingOgp(false);

    if (!titleRef.current && result.title) setTitle(result.title);
    if (!ogImageRef.current && result.image) setOgImage(result.image);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = {
      url: (form.elements.namedItem("url") as HTMLInputElement).value.trim(),
      title: (form.elements.namedItem("title") as HTMLInputElement).value.trim(),
      memo: (form.elements.namedItem("memo") as HTMLTextAreaElement).value.trim(),
      ogImage: ogImage || undefined,
      tagIds: selectedTagIds,
    };

    const newErrors: Record<string, string> = {};
    if (!data.url) newErrors.url = "URL は必須です";
    else {
      try {
        const parsed = new URL(data.url);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          newErrors.url = "URL は http:// または https:// で始まる必要があります";
        }
      } catch {
        newErrors.url = "有効な URL を入力してください";
      }
    }
    if (!data.title) newErrors.title = "タイトルは必須です";
    else if (data.title.length > 200) newErrors.title = "タイトルは200文字以内で入力してください";
    if (data.memo.length > 1000) newErrors.memo = "メモは1000文字以内で入力してください";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setSubmitting(true);
    const result = await action(data);
    setSubmitting(false);

    if (result.error) {
      setErrors({ form: result.error });
      return;
    }

    if (onSuccess) {
      onSuccess();
    } else {
      router.push("/bookmarks");
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errors.form && (
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">{errors.form}</p>
      )}

      <div>
        <label htmlFor="url" className="block text-sm font-medium text-zinc-700">
          URL <span className="text-red-500">*</span>
        </label>
        <input
          id="url"
          name="url"
          type="text"
          defaultValue={defaultValues?.url}
          onBlur={handleUrlBlur}
          className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          placeholder="https://example.com"
        />
        {errors.url && <p className="mt-1 text-xs text-red-500">{errors.url}</p>}
      </div>

      <div>
        <label htmlFor="title" className="block text-sm font-medium text-zinc-700">
          タイトル <span className="text-red-500">*</span>
          {fetchingOgp && <span className="ml-2 text-xs font-normal text-zinc-400">取得中...</span>}
        </label>
        <input
          id="title"
          name="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          placeholder="ページのタイトル"
        />
        {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title}</p>}
      </div>

      <div>
        <label htmlFor="memo" className="block text-sm font-medium text-zinc-700">
          メモ
        </label>
        <textarea
          id="memo"
          name="memo"
          defaultValue={defaultValues?.memo}
          rows={4}
          className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          placeholder="メモ（任意）"
        />
        {errors.memo && <p className="mt-1 text-xs text-red-500">{errors.memo}</p>}
      </div>

      <div>
        <label htmlFor="tag-input" className="block text-sm font-medium text-zinc-700">
          タグ
        </label>
        <div className="mt-1">
          <TagInput
            inputId="tag-input"
            availableTags={localTags}
            selectedTagIds={selectedTagIds}
            onChange={handleTagChange}
          />
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting || fetchingOgp}
          className="cursor-pointer rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          {submitting ? "保存中..." : "保存"}
        </button>
        <button
          type="button"
          onClick={() => (onCancel ? onCancel() : router.push("/bookmarks"))}
          className="cursor-pointer rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}
