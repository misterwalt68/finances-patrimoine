import type { ButtonHTMLAttributes } from "react";

export function Bouton({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`h-11 rounded-lg bg-accent px-4 text-base font-medium text-accent-foreground transition-opacity active:opacity-80 disabled:opacity-60 ${className ?? ""}`}
      {...props}
    />
  );
}
