"use client";

type Option = { value: string; label: string };

type Props = {
  name: string;
  defaultValue: string;
  options: Option[];
};

export function SortSelect({ name, defaultValue, options }: Props) {
  return (
    <select
      name={name}
      defaultValue={defaultValue}
      onChange={(e) => (e.target.form as HTMLFormElement).submit()}
      className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
