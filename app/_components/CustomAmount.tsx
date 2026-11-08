"use client";
import { useState } from "react";
import { Field } from "@/components/ui";

/** "Custom amount" whole-dollar input that stays in sync with a slider through `value`. */
export function CustomAmount({ id, value, onChange }: { id: string; value: number; onChange: (n: number) => void }) {
  const [text, setText] = useState("");
  // Show what the user typed while it still matches the value; otherwise mirror the value (slider moved).
  const shown = text !== "" && Number(text) === value ? text : value > 0 ? String(value) : text === "" ? "" : "0";
  return (
    <Field label="Custom amount">
      <input
        id={id} className="amount-input" inputMode="numeric" pattern="[0-9]*" autoComplete="off"
        placeholder="Any whole-dollar amount" value={shown}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "").slice(0, 9).replace(/^0+(?=\d)/, "");
          setText(digits);
          onChange(digits === "" ? 0 : Number(digits));
        }}
      />
    </Field>
  );
}
