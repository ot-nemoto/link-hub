"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  defaultValues?: {
    url: string;
    title: string;
    memo: string;
  };
  action: (data: { url: string; title: string; memo: string }) => Promise<{ error?: string }>;
};

export function BookmarkForm({ defaultValues, action }: Props) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = {
      url: (form.elements.namedItem("url") as HTMLInputElement).value.trim(),
      title: (form.elements.namedItem("title") as HTMLInputElement).value.trim(),
      memo: (form.elements.namedItem("memo") as HTMLTextAreaElement).value.trim(),
    };

    // クライアントサイドバリデーション
    const newErrors: Record<string, string> = {};
    if (!data.url) newErrors.url = "URL は必須です";
    else {
      try {
        new URL(data.url);
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
      {errors.form && (
        <p className="rounded bg-red-50 p-3 text-sm text-red-600">{errors.form}</p>
      )}

      <div>
        <label htmlFor="url" className="block text-sm font-medium text-gray-700">
          URL <span className="text-red-500">*</span>
        </label>
        <input
          id="url"
          name="url"
          type="text"
          defaultValue={defaultValues?.url}
          className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          placeholder="https://example.com"
        />
        {errors.url && <p className="mt-1 text-xs text-red-500">{errors.url}</p>}
      </div>

      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
          タイトル <span className="text-red-500">*</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          defaultValue={defaultValues?.title}
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

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting}
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
