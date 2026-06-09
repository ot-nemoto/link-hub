"use client";

import { useClerk } from "@clerk/nextjs";

export function LogoutButton() {
  const { signOut } = useClerk();

  return (
    <button
      type="button"
      onClick={() => signOut({ redirectUrl: "/sign-in" })}
      className="cursor-pointer rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
    >
      ログアウト
    </button>
  );
}
