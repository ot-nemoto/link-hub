import { auth, currentUser } from "@clerk/nextjs/server";

import { prisma } from "@/lib/prisma";

export type Session = {
  user: {
    id: string;
    name: string | null;
    email: string;
  };
};

export async function getSession(): Promise<Session | null> {
  // 非本番環境: MOCK_USER_ID / MOCK_USER_EMAIL が設定されている場合は DB から直接返す
  if (process.env.NODE_ENV !== "production") {
    if (process.env.MOCK_USER_ID) {
      const user = await prisma.user.findUnique({ where: { id: process.env.MOCK_USER_ID } });
      if (!user) return null;
      return { user: { id: user.id, name: user.name, email: user.email } };
    }
    if (process.env.MOCK_USER_EMAIL) {
      const user = await prisma.user.findUnique({ where: { email: process.env.MOCK_USER_EMAIL } });
      if (!user) return null;
      return { user: { id: user.id, name: user.name, email: user.email } };
    }
  }

  const { userId } = await auth();
  if (!userId) return null;

  let user = await prisma.user.findUnique({ where: { clerkId: userId } });

  if (!user) {
    const clerkUser = await currentUser();
    const email = clerkUser?.emailAddresses[0]?.emailAddress;
    if (!email) return null;

    user = await prisma.user.upsert({
      where: { clerkId: userId },
      update: { email, name: clerkUser?.fullName ?? undefined },
      create: { clerkId: userId, email, name: clerkUser?.fullName ?? undefined },
    });
  }

  return { user: { id: user.id, name: user.name, email: user.email } };
}
