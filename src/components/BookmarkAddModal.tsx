"use client";

import { useEffect, useRef, useState } from "react";
import { BookmarkForm } from "@/app/(dashboard)/bookmarks/BookmarkForm";

type Tag = { id: string; name: string };

type Props = {
  availableTags: Tag[];
  action: (data: {
    url: string;
    title: string;
    memo: string;
    ogImage?: string;
    tagId?: string | null;
    hideOgImage?: boolean;
  }) => Promise<{ error?: string }>;
  onClose: () => void;
  onSuccess: (data: {
    url: string;
    title: string;
    memo: string;
    ogImage?: string;
    tagId?: string | null;
    hideOgImage?: boolean;
  }) => void;
};

export function BookmarkAddModal({ availableTags, action, onClose, onSuccess }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !submitting) onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, submitting]);

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current && !submitting) onClose();
  }

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label="ブックマーク追加"
      onClick={handleOverlayClick}
      onKeyDown={(e) => {
        if (e.key === "Escape" && !submitting) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    >
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-zinc-900">ブックマークを追加</h2>
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="cursor-pointer rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 disabled:opacity-50"
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
          action={action}
          onSuccess={onSuccess}
          onCancel={onClose}
          onSubmittingChange={setSubmitting}
        />
      </div>
    </div>
  );
}
