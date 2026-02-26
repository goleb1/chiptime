"use client";

import { useState, useTransition } from "react";
import { toggleGameVisibility } from "@/lib/actions/admin";

interface Props {
  gameId: string;
  showOnHomepage: boolean;
}

export default function GameVisibilityToggle({ gameId, showOnHomepage }: Props) {
  const [visible, setVisible] = useState(showOnHomepage);
  const [isPending, startTransition] = useTransition();

  function handleToggle(e: React.MouseEvent) {
    e.preventDefault(); // prevent link navigation if inside an anchor
    e.stopPropagation();
    const next = !visible;
    setVisible(next); // optimistic update
    startTransition(async () => {
      const result = await toggleGameVisibility(gameId, next);
      if (!result.success) {
        setVisible(!next); // revert on error
      }
    });
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      title={visible ? "Visible on homepage — click to hide" : "Hidden from homepage — click to show"}
      className={`flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
        visible
          ? "bg-gold/20 text-gold hover:bg-gold/30"
          : "bg-black/5 text-black/40 hover:bg-black/10 hover:text-black/60"
      } ${isPending ? "opacity-50" : ""}`}
    >
      {visible ? (
        // Eye open
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
          <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
          <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clipRule="evenodd" />
        </svg>
      ) : (
        // Eye closed / slash
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
          <path fillRule="evenodd" d="M3.28 2.22a.75.75 0 0 0-1.06 1.06l14.5 14.5a.75.75 0 1 0 1.06-1.06l-1.745-1.745a10.029 10.029 0 0 0 3.3-4.38 1.651 1.651 0 0 0 0-1.185A10.004 10.004 0 0 0 9.999 3a9.956 9.956 0 0 0-4.744 1.194L3.28 2.22ZM7.752 6.69l1.092 1.092a2.5 2.5 0 0 1 3.374 3.373l1.091 1.092a4 4 0 0 0-5.557-5.557Z" clipRule="evenodd" />
          <path d="m10.748 13.93 2.523 2.523a9.987 9.987 0 0 1-3.27.547c-4.258 0-7.894-2.66-9.337-6.41a1.651 1.651 0 0 1 0-1.186A10.007 10.007 0 0 1 2.839 6.02L6.07 9.252a4 4 0 0 0 4.678 4.678Z" />
        </svg>
      )}
      <span className="hidden sm:inline">{visible ? "On homepage" : "Hidden"}</span>
    </button>
  );
}
