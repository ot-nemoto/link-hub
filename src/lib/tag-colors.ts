const TAG_COLOR_PALETTE = [
  { bg: "bg-blue-50", text: "text-blue-800", activeBg: "bg-blue-600" },
  { bg: "bg-purple-50", text: "text-purple-800", activeBg: "bg-purple-600" },
  { bg: "bg-teal-50", text: "text-teal-800", activeBg: "bg-teal-600" },
  { bg: "bg-orange-50", text: "text-orange-800", activeBg: "bg-orange-600" },
  { bg: "bg-amber-50", text: "text-amber-800", activeBg: "bg-amber-600" },
  { bg: "bg-pink-50", text: "text-pink-800", activeBg: "bg-pink-600" },
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
