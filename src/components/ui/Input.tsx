"use client";

import { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export default function Input({
  label,
  error,
  id,
  className = "",
  ...props
}: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`rounded-md border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
          error
            ? "border-red-500 focus:ring-red-500"
            : "border-gray-300 dark:border-gray-600"
        } bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 ${className}`}
        {...props}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
