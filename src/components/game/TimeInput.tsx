"use client";

import { useCallback } from "react";

interface TimeInputProps {
  hours: number;
  minutes: number;
  seconds: number;
  onChange: (totalSeconds: number) => void;
  onFieldChange: (field: "hours" | "minutes" | "seconds", value: number) => void;
  disabled?: boolean;
}

export default function TimeInput({
  hours,
  minutes,
  seconds,
  onChange,
  onFieldChange,
  disabled = false,
}: TimeInputProps) {
  const handleChange = useCallback(
    (field: "hours" | "minutes" | "seconds", raw: string) => {
      const value = raw === "" ? 0 : parseInt(raw, 10);
      if (isNaN(value)) return;

      let h = hours;
      let m = minutes;
      let s = seconds;

      if (field === "hours") h = Math.max(0, Math.min(99, value));
      if (field === "minutes") m = Math.max(0, Math.min(59, value));
      if (field === "seconds") s = Math.max(0, Math.min(59, value));

      onFieldChange(field, field === "hours" ? h : field === "minutes" ? m : s);
      onChange(h * 3600 + m * 60 + s);
    },
    [hours, minutes, seconds, onChange, onFieldChange]
  );

  const inputClass =
    "w-14 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-center text-sm py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 disabled:opacity-50";

  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        min={0}
        max={99}
        value={hours}
        onChange={(e) => handleChange("hours", e.target.value)}
        disabled={disabled}
        className={inputClass}
        aria-label="Hours"
      />
      <span className="text-gray-500 font-medium">:</span>
      <input
        type="number"
        min={0}
        max={59}
        value={String(minutes).padStart(2, "0")}
        onChange={(e) => handleChange("minutes", e.target.value)}
        disabled={disabled}
        className={inputClass}
        aria-label="Minutes"
      />
      <span className="text-gray-500 font-medium">:</span>
      <input
        type="number"
        min={0}
        max={59}
        value={String(seconds).padStart(2, "0")}
        onChange={(e) => handleChange("seconds", e.target.value)}
        disabled={disabled}
        className={inputClass}
        aria-label="Seconds"
      />
    </div>
  );
}
