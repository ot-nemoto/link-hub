"use client";

type Props = {
  message: string;
  onUndo: () => void;
};

export function UndoSnackbar({ message, onUndo }: Props) {
  return (
    <div role="status" aria-live="polite" className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-lg bg-gray-800 px-5 py-3 text-sm text-white shadow-lg dark:bg-gray-700">
      <span>{message}</span>
      <button
        type="button"
        onClick={onUndo}
        className="font-semibold text-blue-400 hover:text-blue-300"
      >
        元に戻す
      </button>
    </div>
  );
}
