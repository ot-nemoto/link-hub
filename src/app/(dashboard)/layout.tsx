import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { Header } from "@/components/Header";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  return (
    <div className="min-h-screen bg-zinc-50">
      <Header email={session.user.email} />
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
