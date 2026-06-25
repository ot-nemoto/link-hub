"use client";

import { useEffect, useRef } from "react";
import { BookmarkForm } from "@/app/(dashboard)/bookmarks/BookmarkForm";

type Tag = { id: string; name: string };

type Props = {
  availableTags: Tag[];
  defaultValues: {
    url: string;
    title: string;
    memo: string;
    ogImage?: string;
    tagId?: string | null;
  };
  action: (data: {
    url: string;
    title: string;
    memo: string;
    ogImage?: string;
    tagId?: string | null;
  }) => Promise<{ error?: string }>;
  onClose: () => void;
  onSuccess: (data: {
    url: string;
    title: string;
    memo: string;
    ogImage?: string;
    tagId?: string | null;
  }) => void;
};

export function BookmarkEditModal({
  availableTags,
  defaultValues,
  action,
  onClose,
  onSuccess,
}: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose();
  }

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label="ブックマーク編集"
      onClick={handleOverlayClick}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    >
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-zinc-900">ブックマークを編集</h2>
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
        <BookmarkForm
          availableTags={availableTags}
          defaultValues={defaultValues}
          action={action}
          onSuccess={onSuccess}
          onCancel={onClose}
        />
      </div>
    </div>
  );
}
