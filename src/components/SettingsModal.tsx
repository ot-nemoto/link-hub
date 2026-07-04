"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { generateApiKey, revokeApiKey } from "@/app/(dashboard)/api-key-actions";

export function SettingsModal({
  hasInitialApiKey,
  onClose,
}: {
  hasInitialApiKey: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  // hasApiKey: DB にキーが存在するか（実値は保持しない）
  // apiKey: 生成・再生成直後のみ実値を保持（それ以外は null）
  const [hasApiKey, setHasApiKey] = useState(hasInitialApiKey);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  async function handleGenerate() {
    setPending(true);
    setError(null);
    try {
      const r = await generateApiKey();
      if (r.error || !r.apiKey) {
        setError(r.error ?? "API キーの生成に失敗しました");
        return;
      }
      setHasApiKey(true);
      setApiKey(r.apiKey);
      setVisible(true);
      // サーバー側の hasApiKey を更新（閉じて再度開いたときの初期状態を同期）
      router.refresh();
    } catch {
      setError("API キーの生成に失敗しました");
    } finally {
      setPending(false);
    }
  }

  async function handleRevoke() {
    if (
      !window.confirm(
        "API キーを失効します。外部連携で使用中の場合は動作しなくなります。よろしいですか？",
      )
    ) {
      return;
    }
    setPending(true);
    setError(null);
    try {
      const r = await revokeApiKey();
      if (r.error) {
        setError(r.error);
        return;
      }
      setHasApiKey(false);
      setApiKey(null);
      setVisible(false);
      // サーバー側の hasApiKey を更新（閉じて再度開いたときの初期状態を同期）
      router.refresh();
    } catch {
      setError("API キーの失効に失敗しました");
    } finally {
      setPending(false);
    }
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label="設定"
      onClick={handleOverlayClick}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    >
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-zinc-900">設定</h2>
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

        <section>
          <h3 className="mb-1 text-sm font-medium text-zinc-900">API キー</h3>
          <p className="mb-4 text-sm text-zinc-500">
            外部ツールやスクリプトからブックマークを取得するためのキーです（
            <code className="rounded bg-zinc-100 px-1">GET /api/bookmarks</code> ・
            <code className="rounded bg-zinc-100 px-1">Authorization: Bearer &lt;キー&gt;</code>）。
          </p>

          <div className="space-y-3">
            {error && (
              <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
            )}
            {!hasApiKey ? (
              <button
                type="button"
                onClick={handleGenerate}
                disabled={pending}
                className="cursor-pointer rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
              >
                {pending ? "生成中..." : "生成する"}
              </button>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <input
                    type={apiKey && visible ? "text" : "password"}
                    readOnly
                    value={apiKey ?? "placeholder-key-value"}
                    className={`block w-full rounded-md border border-zinc-300 bg-zinc-50 px-3 py-2 font-mono text-sm ${
                      apiKey ? "text-zinc-700" : "text-zinc-400"
                    }`}
                  />
                  {apiKey && (
                    <button
                      type="button"
                      onClick={() => setVisible((v) => !v)}
                      className="shrink-0 cursor-pointer rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
                    >
                      {visible ? "隠す" : "表示"}
                    </button>
                  )}
                </div>
                {apiKey && (
                  <p className="text-xs text-zinc-400">
                    このキーは今だけ表示されます。閉じると再表示できないため、必要ならこの場で控えてください。
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={pending}
                    className="cursor-pointer rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                  >
                    {pending ? "処理中..." : "再生成"}
                  </button>
                  <button
                    type="button"
                    onClick={handleRevoke}
                    disabled={pending}
                    className="cursor-pointer rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    {pending ? "処理中..." : "失効"}
                  </button>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </div>,
    document.body,
  );
}
