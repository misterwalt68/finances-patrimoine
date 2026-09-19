import type { ButtonHTMLAttributes } from "react";

export function Bouton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className="h-11 rounded-lg bg-accent px-4 text-base font-medium text-accent-foreground disabled:opacity-60"
      {...props}
    />
  );
}
