"use client";

type Props = {
  message: string;
  onUndo: () => void;
};

export function UndoSnackbar({ message, onUndo }: Props) {
  return (
    <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-lg bg-zinc-900 px-5 py-3 text-sm text-white shadow-xl">
      <span role="status" aria-live="polite" aria-atomic="true">
        {message}
      </span>
      <button
        type="button"
        onClick={onUndo}
        className="cursor-pointer font-semibold text-zinc-300 hover:text-white"
      >
        元に戻す
      </button>
    </div>
  );
}
