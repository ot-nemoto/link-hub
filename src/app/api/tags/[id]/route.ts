import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const clerkUser = await currentUser();
  if (!clerkUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 401 });
  }

  const { id } = await params;
  const tag = await prisma.tag.findUnique({ where: { id } });
  if (!tag) {
    return NextResponse.json({ error: "Tag not found" }, { status: 404 });
  }
  if (tag.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.tag.delete({ where: { id } });

  return NextResponse.json({ message: "deleted" });
}
