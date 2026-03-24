import { SignOutButton } from "@clerk/nextjs";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { APP_NAME } from "@/lib/constants";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">{APP_NAME}</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{session.user.email}</span>
            <SignOutButton redirectUrl="/sign-in">
              <button
                type="button"
                className="cursor-pointer rounded border border-gray-300 px-3 py-1 text-sm text-gray-600 hover:bg-gray-100"
              >
                ログアウト
              </button>
            </SignOutButton>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-8">{children}</main>
    </div>
  );
}
