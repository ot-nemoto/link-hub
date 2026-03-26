"use client";

import { useActionState } from "react";

import { deleteBookmark } from "./actions";

export function DeleteButton({ id }: { id: string }) {
  const [state, formAction, isPending] = useActionState(deleteBookmark.bind(null, id), {});

  return (
    <form action={formAction}>
      {state?.error && (
        <p className="mb-1 rounded bg-red-50 px-2 py-1 text-xs text-red-600">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="cursor-pointer rounded border border-red-300 px-3 py-1 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
      >
        {isPending ? "削除中..." : "削除"}
      </button>
    </form>
  );
}
