"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import {
  type BookmarkData,
  createBookmark as libCreateBookmark,
  updateBookmark as libUpdateBookmark,
  updateBookmarkTags as libUpdateBookmarkTags,
  reorderBookmarks as libReorderBookmarks,
  deleteBookmark as libDeleteBookmark,
  deleteBookmarks as libDeleteBookmarks,
  bulkAddTags as libBulkAddTags,
} from "@/lib/bookmarks";
import { createTag as libCreateTag, deleteTag as libDeleteTag } from "@/lib/tags";

export async function createBookmark(data: BookmarkData): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const result = await libCreateBookmark(session.user.id, data);
  revalidatePath("/bookmarks");
  return result;
}

export async function updateBookmark(id: string, data: BookmarkData): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const result = await libUpdateBookmark(session.user.id, id, data);
  revalidatePath("/bookmarks");
  return result;
}

export async function updateBookmarkTags(
  id: string,
  tagIds: string[],
): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const result = await libUpdateBookmarkTags(session.user.id, id, tagIds);
  revalidatePath("/bookmarks");
  return result;
}

export async function reorderBookmarks(ids: string[]): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const result = await libReorderBookmarks(session.user.id, ids);
  revalidatePath("/bookmarks");
  return result;
}

export async function createTag(
  name: string,
): Promise<{ tag?: { id: string; name: string }; conflict?: boolean; error?: string }> {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const result = await libCreateTag(session.user.id, name);
  if (result.tag && !result.conflict) revalidatePath("/bookmarks");
  return result;
}

export async function deleteTag(id: string): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const result = await libDeleteTag(session.user.id, id);
  revalidatePath("/bookmarks");
  return result;
}

export async function bulkAddTags(
  bookmarkIds: string[],
  tagIds: string[],
): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const result = await libBulkAddTags(session.user.id, bookmarkIds, tagIds);
  revalidatePath("/bookmarks");
  return result;
}

export async function deleteBookmark(
  id: string,
  _prevState: { error?: string },
): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const result = await libDeleteBookmark(session.user.id, id);
  revalidatePath("/bookmarks");
  return result;
}

export async function deleteBookmarks(ids: string[]): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const result = await libDeleteBookmarks(session.user.id, ids);
  revalidatePath("/bookmarks");
  return result;
}
