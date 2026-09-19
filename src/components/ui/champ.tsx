import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

const classeChamp =
  "h-11 w-full rounded-lg border border-line bg-surface px-4 text-base text-foreground outline-none focus:border-accent";

export function Champ({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-muted">{label}</span>
      <input className={classeChamp} {...props} />
    </label>
  );
}

export function ChampSelect({
  label,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-muted">{label}</span>
      <select className={classeChamp} {...props}>
        {children}
      </select>
    </label>
  );
}
