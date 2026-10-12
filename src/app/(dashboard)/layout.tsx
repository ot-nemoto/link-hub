import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { hasApiKey } from "@/lib/api-key";
import { getSession } from "@/lib/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  return (
    <div className="min-h-screen bg-zinc-50">
      <Header email={session.user.email} hasApiKey={await hasApiKey(session.user.id)} />
      <main className="mx-auto max-w-5xl px-4 pb-8 pt-4">{children}</main>
    </div>
  );
}
