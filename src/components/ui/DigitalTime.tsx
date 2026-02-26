import { secondsToTimeString } from "@/lib/utils";

interface DigitalTimeProps {
  seconds: number | null;
  /** "predicted" (amber, default) or "actual" (green) */
  variant?: "predicted" | "actual";
  className?: string;
}

export default function DigitalTime({
  seconds,
  variant = "predicted",
  className = "",
}: DigitalTimeProps) {
  const text = seconds != null ? secondsToTimeString(seconds) : "--:--:--";
  const awaiting = seconds == null;

  const variantClass = variant === "actual" ? " actual" : "";

  return (
    <span
      className={`digital-time${variantClass}${awaiting ? " awaiting" : ""} ${className}`}
    >
      {text}
    </span>
  );
}
