import { useState } from "react";
import { MemoMarkdown } from "@/components/MemoMarkdown";
import { getDisplayUrl, getFaviconUrl } from "@/lib/domain-groups";
import type { Bookmark } from "./types";

export function BookmarkItemContent({
  bm,
  onEdit,
  onDelete,
}: {
  bm: Bookmark;
  onEdit: (bm: Bookmark) => void;
  onDelete: (bm: Bookmark) => void;
}) {
  const faviconUrl = getFaviconUrl(bm.url);
  const displayUrl = getDisplayUrl(bm.url);
  // 読込失敗した favicon の URL を保持する。URL が変われば再表示される（DOM に display:none を残さない）
  const [erroredFaviconUrl, setErroredFaviconUrl] = useState<string | null>(null);
  const showFavicon = faviconUrl && erroredFaviconUrl !== faviconUrl;
  return (
    <>
      {showFavicon && (
        <img
          src={faviconUrl}
          alt=""
          className="h-4 w-4 shrink-0 rounded-sm"
          referrerPolicy="no-referrer"
          onError={() => setErroredFaviconUrl(faviconUrl)}
        />
      )}
      <div className="min-w-0 flex-1">
        <a
          href={bm.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block truncate border-b border-zinc-300 text-[15px] font-normal text-zinc-900 transition-colors duration-150 hover:border-purple-700 hover:text-purple-700"
        >
          {bm.title}
        </a>
        <p className="truncate text-xs text-zinc-500">{displayUrl}</p>
        {bm.memo && (
          <div className="mt-1.5 flex items-start gap-1.5">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="mt-1.5 shrink-0 text-zinc-400"
            >
              <path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9Z" />
              <path d="M15 3v4a2 2 0 0 0 2 2h4" />
            </svg>
            <div className="min-w-0 flex-1 break-words rounded-md bg-zinc-100 px-2.5 py-1.5 text-xs leading-relaxed text-zinc-700">
              <MemoMarkdown text={bm.memo} />
            </div>
          </div>
        )}
      </div>
      {bm.ogImage && !bm.hideOgImage && (
        <img
          src={bm.ogImage}
          alt=""
          className="h-20 w-36 shrink-0 rounded-md object-cover"
          referrerPolicy="no-referrer"
        />
      )}
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={() => onEdit(bm)}
          className="cursor-pointer rounded bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-200"
        >
          編集
        </button>
        <button
          type="button"
          onClick={() => onDelete(bm)}
          className="cursor-pointer rounded border border-red-300 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
        >
          削除
        </button>
      </div>
    </>
  );
}
