import { AWARD_DEFINITIONS } from "@/lib/constants";
import type { AwardType } from "@/lib/types";

interface AwardBadgeProps {
  awardType: AwardType;
}

export default function AwardBadge({ awardType }: AwardBadgeProps) {
  const def = AWARD_DEFINITIONS.find((a) => a.type === awardType);
  if (!def) return null;

  return (
    <span className="inline-block cursor-help" title={`${def.label}: ${def.description}`}>
      {def.icon}
    </span>
  );
}
