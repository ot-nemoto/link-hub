import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function POST() {
  const clerkUser = await currentUser();
  if (!clerkUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) {
    return NextResponse.json({ error: "Email not found" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({
    where: { clerkId: clerkUser.id },
  });

  const user = await prisma.user.upsert({
    where: { clerkId: clerkUser.id },
    update: {
      email,
      name: clerkUser.fullName ?? undefined,
    },
    create: {
      clerkId: clerkUser.id,
      email,
      name: clerkUser.fullName ?? undefined,
    },
  });

  const status = existing ? 200 : 201;
  return NextResponse.json(
    {
      id: user.id,
      clerkId: user.clerkId,
      email: user.email,
      name: user.name,
    },
    { status },
  );
}
