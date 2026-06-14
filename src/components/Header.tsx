import { LogoutButton } from "@/app/(dashboard)/LogoutButton";

function LinkHubIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

type Props = {
  email: string;
};

export function Header({ email }: Props) {
  return (
    <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2 text-zinc-900">
          <LinkHubIcon />
          <span className="text-lg font-bold">Link Hub</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-zinc-600">{email}</span>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
