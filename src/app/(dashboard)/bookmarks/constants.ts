export const LIMIT_OPTIONS = [5, 10, 20, 50, 100] as const;
export type LimitOption = (typeof LIMIT_OPTIONS)[number];
