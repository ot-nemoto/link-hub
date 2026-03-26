"use client";

import { useActionState } from "react";

import { deleteBookmark } from "./actions";

export function DeleteButton({ id }: { id: string }) {
  const [state, formAction] = useActionState(deleteBookmark.bind(null, id), {});

  return (
    <form action={formAction}>
      {state?.error && <p className="mt-1 text-xs text-red-500">{state.error}</p>}
      <button
        type="submit"
        className="cursor-pointer rounded border border-red-300 px-3 py-1 text-sm text-red-600 hover:bg-red-50"
      >
        削除
      </button>
    </form>
  );
}
