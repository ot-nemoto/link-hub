import { LogoutButton } from "@/app/(dashboard)/LogoutButton";
import { AppIcon } from "@/components/icons/AppIcon";

type Props = {
  email: string;
};

export function Header({ email }: Props) {
  return (
    <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2 text-zinc-900">
          <AppIcon />
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
