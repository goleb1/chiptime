import { secondsToTimeString } from "@/lib/utils";

interface DigitalTimeProps {
  seconds: number | null;
  className?: string;
}

export default function DigitalTime({ seconds, className = "" }: DigitalTimeProps) {
  const text = seconds != null ? secondsToTimeString(seconds) : "--:--:--";
  const awaiting = seconds == null;

  return (
    <span className={`digital-time${awaiting ? " awaiting" : ""} ${className}`}>
      {text}
    </span>
  );
}
