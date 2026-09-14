const TAG_COLOR_PALETTE = [
  { bg: "bg-red-50", text: "text-red-800", activeBg: "bg-red-600", border: "border-red-500" },
  {
    bg: "bg-orange-50",
    text: "text-orange-800",
    activeBg: "bg-orange-600",
    border: "border-orange-500",
  },
  {
    bg: "bg-amber-50",
    text: "text-amber-800",
    activeBg: "bg-amber-600",
    border: "border-amber-500",
  },
  {
    bg: "bg-yellow-50",
    text: "text-yellow-800",
    activeBg: "bg-yellow-600",
    border: "border-yellow-500",
  },
  { bg: "bg-lime-50", text: "text-lime-800", activeBg: "bg-lime-600", border: "border-lime-500" },
  {
    bg: "bg-green-50",
    text: "text-green-800",
    activeBg: "bg-green-600",
    border: "border-green-500",
  },
  {
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    activeBg: "bg-emerald-600",
    border: "border-emerald-500",
  },
  { bg: "bg-teal-50", text: "text-teal-800", activeBg: "bg-teal-600", border: "border-teal-500" },
  { bg: "bg-cyan-50", text: "text-cyan-800", activeBg: "bg-cyan-600", border: "border-cyan-500" },
  { bg: "bg-sky-50", text: "text-sky-800", activeBg: "bg-sky-600", border: "border-sky-500" },
  { bg: "bg-blue-50", text: "text-blue-800", activeBg: "bg-blue-600", border: "border-blue-500" },
  {
    bg: "bg-indigo-50",
    text: "text-indigo-800",
    activeBg: "bg-indigo-600",
    border: "border-indigo-500",
  },
  {
    bg: "bg-violet-50",
    text: "text-violet-800",
    activeBg: "bg-violet-600",
    border: "border-violet-500",
  },
  {
    bg: "bg-purple-50",
    text: "text-purple-800",
    activeBg: "bg-purple-600",
    border: "border-purple-500",
  },
  {
    bg: "bg-fuchsia-50",
    text: "text-fuchsia-800",
    activeBg: "bg-fuchsia-600",
    border: "border-fuchsia-500",
  },
  { bg: "bg-pink-50", text: "text-pink-800", activeBg: "bg-pink-600", border: "border-pink-500" },
  { bg: "bg-rose-50", text: "text-rose-800", activeBg: "bg-rose-600", border: "border-rose-500" },
] as const;

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getTagColor(tagName: string) {
  const index = hashString(tagName) % TAG_COLOR_PALETTE.length;
  return TAG_COLOR_PALETTE[index];
}
