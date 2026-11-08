"use client";
import { useState } from "react";
import { cn, type } from "@/components/ui/tw";

/**
 * The big budget number, which is also the input: hover or focus it and type your own whole-dollar amount.
 * The slider next to it reads the same value, so each updates the other.
 */
export function EditableAmount({ id, value, onChange, label, size = "numeral" }: {
  id: string; value: number; onChange: (n: number) => void; label: string; size?: "numeral" | "numeral-lg";
}) {
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState("");
  // While typing show exactly what was typed (so an empty box stays empty); otherwise mirror the value with commas.
  const shown = focused ? text : value > 0 ? value.toLocaleString("en-US") : "0";
  return (
    <label className={cn(type[size], "flex min-h-11 w-fit max-w-full cursor-text items-baseline")} htmlFor={id}>
      <span aria-hidden="true">$</span>
      <input
        id={id} aria-label={label} inputMode="numeric" pattern="[0-9]*" autoComplete="off" spellCheck={false}
        className="m-0 max-w-full min-w-[1ch] border-0 bg-transparent p-0 font-[inherit] tracking-[inherit] text-inherit outline-none [font-stretch:inherit]"
        value={shown} size={Math.max(1, shown.length)}
        onFocus={(e) => { setFocused(true); setText(value > 0 ? String(value) : ""); e.currentTarget.select(); }}
        onBlur={() => setFocused(false)}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "").slice(0, 9).replace(/^0+(?=\d)/, "");
          setText(digits);
          onChange(digits === "" ? 0 : Number(digits));
        }}
      />
    </label>
  );
}
