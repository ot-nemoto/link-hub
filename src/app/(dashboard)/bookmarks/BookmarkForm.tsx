"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { getTagColor } from "@/lib/tag-colors";
import { fetchOgp } from "./fetchOgp";

type Tag = { id: string; name: string };

type BookmarkFormData = {
  url: string;
  title: string;
  memo: string;
  ogImage?: string | null;
  favicon?: string | null;
  tagId?: string | null;
  hideOgImage?: boolean;
};

type Props = {
  availableTags: Tag[];
  defaultValues?: BookmarkFormData;
  action: (data: BookmarkFormData) => Promise<{ error?: string }>;
  onSuccess?: (data: BookmarkFormData) => void;
  onCancel?: () => void;
  onSubmittingChange?: (submitting: boolean) => void;
};

export function BookmarkForm({
  availableTags,
  defaultValues,
  action,
  onSuccess,
  onCancel,
  onSubmittingChange,
}: Props) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState(defaultValues?.title ?? "");
  const [ogImage, setOgImage] = useState(defaultValues?.ogImage ?? "");
  const [favicon, setFavicon] = useState(defaultValues?.favicon ?? "");
  const [hideOgImage, setHideOgImage] = useState(defaultValues?.hideOgImage ?? false);
  const [fetchingOgp, setFetchingOgp] = useState(false);
  const [refetching, setRefetching] = useState(false);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(defaultValues?.tagId ?? null);
  const isEditing = defaultValues !== undefined;

  const urlInputRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef(title);
  const ogImageRef = useRef(ogImage);
  const faviconRef = useRef(favicon);
  useEffect(() => {
    titleRef.current = title;
  }, [title]);
  useEffect(() => {
    ogImageRef.current = ogImage;
  }, [ogImage]);
  useEffect(() => {
    faviconRef.current = favicon;
  }, [favicon]);

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
    if (!faviconRef.current && result.favicon) setFavicon(result.favicon);
  }

  // 押した時点の URL で OGP 画像・ファビコンを取り直して上書きする（タイトルはユーザー入力を優先して触らない）
  async function handleRefetch() {
    const url = urlInputRef.current?.value.trim() ?? "";
    const { url: _url, refetch: _refetch, ...rest } = errors;
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error();
    } catch {
      setErrors({ ...rest, url: "再取得には http:// または https:// の URL を入力してください" });
      return;
    }
    setErrors(rest);

    setRefetching(true);
    const result = await fetchOgp(url);
    setRefetching(false);

    if (result.error) {
      setErrors({ ...rest, refetch: "取得に失敗しました。URL を確認して再度お試しください" });
      return;
    }
    setOgImage(result.image ?? "");
    setFavicon(result.favicon ?? "");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = {
      url: (form.elements.namedItem("url") as HTMLInputElement).value.trim(),
      title: (form.elements.namedItem("title") as HTMLInputElement).value.trim(),
      memo: (form.elements.namedItem("memo") as HTMLTextAreaElement).value.trim(),
      // 編集時は空を null で送り、再取得で消えた値を保存に反映する
      ogImage: ogImage || (isEditing ? null : undefined),
      favicon: favicon || (isEditing ? null : undefined),
      tagId: selectedTagId,
      hideOgImage,
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
    onSubmittingChange?.(true);
    let result: { error?: string };
    try {
      result = await action(data);
    } catch {
      // action が reject した場合も送信中状態を解除し、モーダルを閉じられるようにする
      result = { error: "保存に失敗しました。時間をおいて再度お試しください" };
    }

    if (result.error) {
      setSubmitting(false);
      onSubmittingChange?.(false);
      setErrors({ form: result.error });
      return;
    }

    // 成功時は submitting を維持し、モーダルが閉じる / 遷移するまでフォームを再有効化しない
    if (onSuccess) {
      onSuccess(data);
    } else {
      router.push("/bookmarks");
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <fieldset disabled={submitting} className="space-y-4">
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
            ref={urlInputRef}
            defaultValue={defaultValues?.url}
            // 編集時は自動で取得しない（取り直しは「再取得」ボタンで明示的に行う）
            onBlur={isEditing ? undefined : handleUrlBlur}
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:bg-zinc-50 disabled:text-zinc-500"
            placeholder="https://example.com"
          />
          {errors.url && <p className="mt-1 text-xs text-red-500">{errors.url}</p>}
        </div>

        <div>
          <label htmlFor="title" className="block text-sm font-medium text-zinc-700">
            タイトル <span className="text-red-500">*</span>
            {fetchingOgp && (
              <span className="ml-2 text-xs font-normal text-zinc-400">取得中...</span>
            )}
          </label>
          <input
            id="title"
            name="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:bg-zinc-50 disabled:text-zinc-500"
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
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:bg-zinc-50 disabled:text-zinc-500"
            placeholder="メモ（任意）　**太字** *斜体* `コード` [リンク](URL) ~~取り消し~~ が使えます"
          />
          {errors.memo && <p className="mt-1 text-xs text-red-500">{errors.memo}</p>}
        </div>

        {isEditing && (
          <div>
            <span className="block text-sm font-medium text-zinc-700">OGP画像・アイコン</span>
            <div className="mt-1 flex items-center gap-3">
              {ogImage ? (
                <img
                  src={ogImage}
                  alt=""
                  referrerPolicy="no-referrer"
                  className={`h-16 w-28 shrink-0 rounded border border-zinc-200 object-contain ${
                    hideOgImage ? "opacity-40" : ""
                  }`}
                />
              ) : (
                <span className="flex h-16 w-28 shrink-0 items-center justify-center rounded border border-dashed border-zinc-300 text-xs text-zinc-400">
                  画像なし
                </span>
              )}
              {favicon ? (
                <img
                  src={favicon}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="h-6 w-6 shrink-0 object-contain"
                />
              ) : (
                <span className="shrink-0 text-xs text-zinc-400">アイコンなし</span>
              )}
              <button
                type="button"
                disabled={refetching}
                onClick={handleRefetch}
                className="cursor-pointer rounded-md border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
              >
                {refetching ? "取得中..." : "再取得"}
              </button>
            </div>
            {ogImage && (
              <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  checked={hideOgImage}
                  onChange={(e) => setHideOgImage(e.target.checked)}
                  className="h-4 w-4 cursor-pointer rounded border-zinc-300"
                />
                一覧に表示しない
              </label>
            )}
            {errors.refetch && <p className="mt-1 text-xs text-red-500">{errors.refetch}</p>}
          </div>
        )}

        <div>
          <label htmlFor="tag" className="block text-sm font-medium text-zinc-700">
            タグ
          </label>
          <div className="mt-1 flex flex-wrap gap-2">
            <button
              type="button"
              aria-pressed={selectedTagId === null}
              onClick={() => setSelectedTagId(null)}
              className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                selectedTagId === null
                  ? "bg-zinc-800 text-white"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              未分類
            </button>
            {availableTags.map((tag) => {
              const color = getTagColor(tag.name);
              const isSelected = selectedTagId === tag.id;
              return (
                <button
                  key={tag.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSelectedTagId(tag.id)}
                  className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    isSelected
                      ? `${color.activeBg} text-white`
                      : `${color.bg} ${color.text} hover:opacity-80`
                  }`}
                >
                  {tag.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting || fetchingOgp || refetching}
            className="cursor-pointer rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            {submitting ? "保存中..." : "保存"}
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => (onCancel ? onCancel() : router.push("/bookmarks"))}
            className="cursor-pointer rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            キャンセル
          </button>
        </div>
      </fieldset>
    </form>
  );
}
