"use client";

import { useRef, useEffect, useCallback } from "react";

interface TimeInputProps {
  hours: number;
  minutes: number;
  seconds: number;
  onChange: (totalSeconds: number) => void;
  onFieldChange: (field: "hours" | "minutes" | "seconds", value: number) => void;
  disabled?: boolean;
}

const ITEM_HEIGHT = 36;
const VISIBLE_ITEMS = 3;
const PADDING_ITEMS = Math.floor(VISIBLE_ITEMS / 2);

function generateRange(max: number): number[] {
  return Array.from({ length: max + 1 }, (_, i) => i);
}

function ScrollColumn({
  values,
  selected,
  onSelect,
  disabled,
  label,
  padDisplay,
}: {
  values: number[];
  selected: number;
  onSelect: (value: number) => void;
  disabled: boolean;
  label: string;
  padDisplay?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const scrollToValue = useCallback(
    (value: number, smooth = false) => {
      const container = containerRef.current;
      if (!container) return;
      const index = values.indexOf(value);
      if (index === -1) return;
      container.scrollTo({
        top: index * ITEM_HEIGHT,
        behavior: smooth ? "smooth" : "instant",
      });
    },
    [values]
  );

  useEffect(() => {
    // Only programmatically scroll if we're not mid-user-scroll
    if (!isScrollingRef.current) {
      scrollToValue(selected);
    }
  }, [selected, scrollToValue]);

  const handleScroll = useCallback(() => {
    isScrollingRef.current = true;
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      const container = containerRef.current;
      if (!container) return;

      const scrollTop = container.scrollTop;
      const index = Math.round(scrollTop / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(index, values.length - 1));
      const value = values[clampedIndex];

      // Snap to center
      container.scrollTo({
        top: clampedIndex * ITEM_HEIGHT,
        behavior: "smooth",
      });

      if (value !== selected) {
        onSelect(value);
      }
      isScrollingRef.current = false;
    }, 100);
  }, [values, selected, onSelect]);

  const handleItemClick = useCallback(
    (value: number) => {
      if (disabled) return;
      onSelect(value);
      scrollToValue(value, true);
    },
    [disabled, onSelect, scrollToValue]
  );

  return (
    <div className="flex flex-col items-center">
      <span className="text-[10px] text-black/40 uppercase tracking-wide mb-1">
        {label}
      </span>
      <div className="relative" style={{ height: ITEM_HEIGHT * VISIBLE_ITEMS }}>
        {/* Highlight band */}
        <div
          className="absolute inset-x-0 pointer-events-none bg-track-red/10 border-y border-track-red/30 z-10"
          style={{
            top: PADDING_ITEMS * ITEM_HEIGHT,
            height: ITEM_HEIGHT,
          }}
        />
        <div
          ref={containerRef}
          onScroll={disabled ? undefined : handleScroll}
          className="h-full w-full overflow-y-auto scrollbar-hide relative z-20"
          style={{ scrollSnapType: "y mandatory", scrollPaddingTop: PADDING_ITEMS * ITEM_HEIGHT }}
          aria-label={label}
        >
          {/* Top padding */}
          {Array.from({ length: PADDING_ITEMS }).map((_, i) => (
            <div key={`top-${i}`} style={{ height: ITEM_HEIGHT }} />
          ))}
          {values.map((v) => {
            const isSelected = v === selected;
            return (
              <div
                key={v}
                onClick={() => handleItemClick(v)}
                className={`flex items-center justify-center text-sm font-mono cursor-pointer select-none transition-colors ${
                  isSelected
                    ? "text-track-red font-semibold"
                    : "text-black/30"
                } ${disabled ? "opacity-50 cursor-default" : ""}`}
                style={{
                  height: ITEM_HEIGHT,
                  scrollSnapAlign: "start",
                }}
              >
                {padDisplay ? String(v).padStart(2, "0") : v}
              </div>
            );
          })}
          {/* Bottom padding */}
          {Array.from({ length: PADDING_ITEMS }).map((_, i) => (
            <div key={`bot-${i}`} style={{ height: ITEM_HEIGHT }} />
          ))}
        </div>
      </div>
    </div>
  );
}

const HOURS = generateRange(99);
const MINUTES = generateRange(59);
const SECONDS = generateRange(59);

export default function TimeInput({
  hours,
  minutes,
  seconds,
  onChange,
  onFieldChange,
  disabled = false,
}: TimeInputProps) {
  const handleSelect = useCallback(
    (field: "hours" | "minutes" | "seconds", value: number) => {
      onFieldChange(field, value);
      const h = field === "hours" ? value : hours;
      const m = field === "minutes" ? value : minutes;
      const s = field === "seconds" ? value : seconds;
      onChange(h * 3600 + m * 60 + s);
    },
    [hours, minutes, seconds, onChange, onFieldChange]
  );

  return (
    <div className="flex items-end gap-0.5 w-full">
      <div className="flex-1 min-w-0">
        <ScrollColumn
          values={HOURS}
          selected={hours}
          onSelect={(v) => handleSelect("hours", v)}
          disabled={disabled}
          label="hr"
        />
      </div>
      <span className="text-black/30 font-medium text-lg pb-8">:</span>
      <div className="flex-1 min-w-0">
        <ScrollColumn
          values={MINUTES}
          selected={minutes}
          onSelect={(v) => handleSelect("minutes", v)}
          disabled={disabled}
          label="min"
          padDisplay
        />
      </div>
      <span className="text-black/30 font-medium text-lg pb-8">:</span>
      <div className="flex-1 min-w-0">
        <ScrollColumn
          values={SECONDS}
          selected={seconds}
          onSelect={(v) => handleSelect("seconds", v)}
          disabled={disabled}
          label="sec"
          padDisplay
        />
      </div>
    </div>
  );
}
