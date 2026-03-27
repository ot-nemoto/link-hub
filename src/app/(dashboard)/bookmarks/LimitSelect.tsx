"use client";

import { LIMIT_OPTIONS } from "./constants";

type Props = {
  name: string;
  defaultValue: number;
};

export function LimitSelect({ name, defaultValue }: Props) {
  return (
    <select
      name={name}
      defaultValue={defaultValue}
      onChange={(e) => e.currentTarget.form?.submit()}
      className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
    >
      {LIMIT_OPTIONS.map((n) => (
        <option key={n} value={n}>
          {n}件
        </option>
      ))}
    </select>
  );
}
