import { BookmarkForm } from "../BookmarkForm";
import { createBookmark } from "../actions";

export default function NewBookmarkPage() {
  return (
    <div>
      <h2 className="mb-6 text-xl font-semibold text-gray-900">ブックマークを追加</h2>
      <BookmarkForm action={createBookmark} />
    </div>
  );
}
