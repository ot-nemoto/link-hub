import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { APP_NAME } from "@/lib/constants";
import { LogoutButton } from "./LogoutButton";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <h1 className="text-lg font-bold text-zinc-900">{APP_NAME}</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-600">{session.user.email}</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
