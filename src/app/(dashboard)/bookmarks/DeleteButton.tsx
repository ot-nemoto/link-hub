"use client";

import { useActionState } from "react";

import { deleteBookmark } from "./actions";

export function DeleteButton({ id }: { id: string }) {
  const [state, formAction, isPending] = useActionState(deleteBookmark.bind(null, id), {});

  return (
    <form action={formAction}>
      {state?.error && (
        <p className="mb-1 rounded-md bg-red-50 px-4 py-3 text-xs text-red-600">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="cursor-pointer rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
      >
        {isPending ? "削除中..." : "削除"}
      </button>
    </form>
  );
}
