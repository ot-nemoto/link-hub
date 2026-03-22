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
