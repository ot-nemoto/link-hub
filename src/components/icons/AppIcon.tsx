type Props = {
  size?: number;
};

export function AppIcon({ size = 20 }: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      <line x1="12" y1="5" x2="12" y2="2" />
      <line x1="12" y1="22" x2="12" y2="19" />
      <line x1="5" y1="12" x2="2" y2="12" />
      <line x1="22" y1="12" x2="19" y2="12" />
    </svg>
  );
}
