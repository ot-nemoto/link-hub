import { getDomain, getFaviconUrl } from "@/lib/domain-groups";
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
  const domain = getDomain(bm.url);
  return (
    <>
      {faviconUrl && (
        <img
          src={faviconUrl}
          alt=""
          className="h-4 w-4 shrink-0 rounded-sm"
          referrerPolicy="no-referrer"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      )}
      <div className="min-w-0 flex-1">
        <a
          href={bm.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block truncate text-[15px] font-semibold text-zinc-900 transition-colors duration-150 hover:text-purple-700 hover:underline"
        >
          {bm.title}
        </a>
        <p className="truncate text-xs text-zinc-500">{domain || bm.url}</p>
        {bm.memo && <p className="truncate text-xs text-zinc-600">{bm.memo}</p>}
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
