import { SignOutButton } from "@clerk/nextjs";

export default function AuthErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      <div className="rounded-lg bg-white p-8 shadow-sm">
        <h1 className="mb-4 text-lg font-bold text-red-600">認証エラー</h1>
        <p className="mb-6 text-sm text-zinc-600">
          このアカウントはすでに別のユーザーに紐付けられています。
        </p>
        <SignOutButton redirectUrl="/sign-in">
          <button
            type="button"
            className="cursor-pointer rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            サインアウト
          </button>
        </SignOutButton>
      </div>
    </div>
  );
}
