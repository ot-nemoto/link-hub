"use client";

import { useClerk } from "@clerk/nextjs";

export function LogoutButton() {
  const { signOut } = useClerk();

  return (
    <button
      type="button"
      onClick={() => signOut({ redirectUrl: "/sign-in" })}
      className="cursor-pointer rounded border border-gray-300 px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
    >
      ログアウト
    </button>
  );
}
