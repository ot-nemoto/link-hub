import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  url: z
    .string()
    .url()
    .refine((v) => v.startsWith("http://") || v.startsWith("https://"), {
      message: "URL must use http or https",
    }),
  title: z.string().min(1).max(200),
  memo: z.string().max(1000).optional(),
  ogImage: z.string().url().optional(),
});

export async function GET() {
  const clerkUser = await currentUser();
  if (!clerkUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 401 });
  }

  const bookmarks = await prisma.bookmark.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(bookmarks);
}

export async function POST(request: Request) {
  const clerkUser = await currentUser();
  if (!clerkUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 401 });
  }

  const body = await request.json();
  const result = createSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
  }

  const bookmark = await prisma.bookmark.create({
    data: {
      userId: user.id,
      url: result.data.url,
      title: result.data.title,
      memo: result.data.memo ?? null,
      ogImage: result.data.ogImage ?? null,
    },
  });

  return NextResponse.json(bookmark, { status: 201 });
}
