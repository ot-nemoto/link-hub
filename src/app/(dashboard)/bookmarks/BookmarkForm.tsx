"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { fetchOgp } from "./fetchOgp";
import { TagInput, type Tag } from "./TagInput";

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
};

export function BookmarkForm({ availableTags, defaultValues, action }: Props) {
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

  // fetchOgp の await 中に state が更新されても常に最新値を参照するための ref
  const titleRef = useRef(title);
  const ogImageRef = useRef(ogImage);
  useEffect(() => { titleRef.current = title; }, [title]);
  useEffect(() => { ogImageRef.current = ogImage; }, [ogImage]);

  async function handleUrlBlur(e: React.FocusEvent<HTMLInputElement>) {
    const url = e.currentTarget.value.trim();
    if (!url) return;

    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return;
    } catch {
      return;
    }

    // タイトルと ogImage が両方入力済みの場合は取得しない
    if (titleRef.current && ogImageRef.current) return;

    setFetchingOgp(true);
    const result = await fetchOgp(url);
    setFetchingOgp(false);

    // await 後は ref で最新値を確認（クロージャの stale state を避けるため）
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

    // クライアントサイドバリデーション
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

    router.push("/bookmarks");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errors.form && <p className="rounded bg-red-50 p-3 text-sm text-red-600">{errors.form}</p>}

      <div>
        <label htmlFor="url" className="block text-sm font-medium text-gray-700">
          URL <span className="text-red-500">*</span>
        </label>
        <input
          id="url"
          name="url"
          type="text"
          defaultValue={defaultValues?.url}
          onBlur={handleUrlBlur}
          className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          placeholder="https://example.com"
        />
        {errors.url && <p className="mt-1 text-xs text-red-500">{errors.url}</p>}
      </div>

      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
          タイトル <span className="text-red-500">*</span>
          {fetchingOgp && <span className="ml-2 text-xs font-normal text-gray-400">取得中...</span>}
        </label>
        <input
          id="title"
          name="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          placeholder="ページのタイトル"
        />
        {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title}</p>}
      </div>

      <div>
        <label htmlFor="memo" className="block text-sm font-medium text-gray-700">
          メモ
        </label>
        <textarea
          id="memo"
          name="memo"
          defaultValue={defaultValues?.memo}
          rows={4}
          className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          placeholder="メモ（任意）"
        />
        {errors.memo && <p className="mt-1 text-xs text-red-500">{errors.memo}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          タグ
        </label>
        <div className="mt-1">
          <TagInput
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
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? "保存中..." : "保存"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/bookmarks")}
          className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}
