import { SignOutButton } from "@clerk/nextjs";

export default function AuthErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="rounded-lg bg-white p-8 shadow-md">
        <h1 className="mb-4 text-xl font-bold text-red-600">認証エラー</h1>
        <p className="mb-6 text-gray-600">
          このアカウントはすでに別のユーザーに紐付けられています。
        </p>
        <SignOutButton redirectUrl="/sign-in">
          <button
            type="button"
            className="rounded bg-gray-800 px-4 py-2 text-white hover:bg-gray-700"
          >
            サインアウト
          </button>
        </SignOutButton>
      </div>
    </div>
  );
}
