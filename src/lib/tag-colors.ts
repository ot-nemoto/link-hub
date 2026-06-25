const TAG_COLOR_PALETTE = [
  { bg: "bg-red-50", text: "text-red-800", activeBg: "bg-red-600" },
  { bg: "bg-orange-50", text: "text-orange-800", activeBg: "bg-orange-600" },
  { bg: "bg-amber-50", text: "text-amber-800", activeBg: "bg-amber-600" },
  { bg: "bg-yellow-50", text: "text-yellow-800", activeBg: "bg-yellow-600" },
  { bg: "bg-lime-50", text: "text-lime-800", activeBg: "bg-lime-600" },
  { bg: "bg-green-50", text: "text-green-800", activeBg: "bg-green-600" },
  { bg: "bg-emerald-50", text: "text-emerald-800", activeBg: "bg-emerald-600" },
  { bg: "bg-teal-50", text: "text-teal-800", activeBg: "bg-teal-600" },
  { bg: "bg-cyan-50", text: "text-cyan-800", activeBg: "bg-cyan-600" },
  { bg: "bg-sky-50", text: "text-sky-800", activeBg: "bg-sky-600" },
  { bg: "bg-blue-50", text: "text-blue-800", activeBg: "bg-blue-600" },
  { bg: "bg-indigo-50", text: "text-indigo-800", activeBg: "bg-indigo-600" },
  { bg: "bg-violet-50", text: "text-violet-800", activeBg: "bg-violet-600" },
  { bg: "bg-purple-50", text: "text-purple-800", activeBg: "bg-purple-600" },
  { bg: "bg-fuchsia-50", text: "text-fuchsia-800", activeBg: "bg-fuchsia-600" },
  { bg: "bg-pink-50", text: "text-pink-800", activeBg: "bg-pink-600" },
  { bg: "bg-rose-50", text: "text-rose-800", activeBg: "bg-rose-600" },
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
