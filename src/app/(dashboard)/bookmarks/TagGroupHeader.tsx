import type { ReactNode } from "react";
import { getTagColor } from "@/lib/tag-colors";
import type { TagItem } from "./types";

// --tag-header-top / --tag-scroll-margin は BookmarkList が検索窓・タグナビの帯の高さから算出する（未算出時は従来の固定値）
export const STICKY_GROUP_HEADER = "sticky top-[var(--tag-header-top,14rem)] z-[5]";
export const GROUP_SCROLL_MARGIN = "scroll-mt-[var(--tag-scroll-margin,14rem)]";

/**
 * タググループの見出しバンド（色帯・ドット・タグ名・件数・シェブロン）。
 * インタラクティブ描画と SSR フォールバック描画の両方から利用する。
 * - onToggle を渡すとクリックで折りたたむ button、渡さなければ静的な div になる
 * - dragHandle はドラッグ操作要素を差し込むスロット（未分類など不要なら undefined）
 */
export function TagGroupHeader({
  tag,
  count,
  collapsed,
  onToggle,
  dragHandle,
}: {
  tag: TagItem | null;
  count: number;
  collapsed: boolean;
  onToggle?: () => void;
  dragHandle?: ReactNode;
}) {
  const color = tag ? getTagColor(tag.name) : null;
  const content = (
    <>
      <span
        className={`inline-block h-3 w-3 shrink-0 rounded-full ${color ? color.activeBg : "bg-zinc-500"}`}
      />
      <span className={`text-lg font-bold ${color ? color.text : "text-zinc-600"}`}>
        {tag ? tag.name : "未分類"}
      </span>
      <span
        className={`rounded-full bg-white/70 px-2 py-0.5 text-xs font-medium ${color ? color.text : "text-zinc-500"}`}
      >
        {count}
      </span>
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
        className={`ml-auto opacity-70 transition-transform ${color ? color.text : "text-zinc-500"} ${collapsed ? "-rotate-90" : ""}`}
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </>
  );

  return (
    <div
      className={`${STICKY_GROUP_HEADER} mb-2 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 ${color ? color.bg : "bg-zinc-100"}`}
    >
      {dragHandle}
      {onToggle ? (
        <button
          type="button"
          onClick={onToggle}
          className="flex flex-1 cursor-pointer items-center gap-2"
        >
          {content}
        </button>
      ) : (
        <div className="flex flex-1 items-center gap-2">{content}</div>
      )}
    </div>
  );
}
