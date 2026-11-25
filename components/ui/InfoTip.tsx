"use client";

import { useEffect, useId, useRef, useState } from "react";

// On phones the tip is a full-width card under the icon (a floating box would run
// off the screen edge); from `sm` up it sits beside or under the icon.
const PHONE_CLASS =
  "max-sm:fixed max-sm:inset-x-4 max-sm:top-auto max-sm:mt-7 max-sm:w-auto";

const SIDE_CLASS = {
  right: `${PHONE_CLASS} sm:top-1/2 sm:left-full sm:ml-2 sm:-translate-y-1/2`,
  // Under the icon, for icons near the right edge of the screen.
  below: `${PHONE_CLASS} sm:left-1/2 sm:-translate-x-1/2`,
} as const;

/**
 * A small (i) icon that explains a term right where it appears. The tip shows
 * while the pointer is over the icon, or after a tap or Enter (touch screens
 * have no hover); a tap elsewhere or Escape closes it.
 */
export function InfoTip({
  label,
  children,
  side = "right",
}: Readonly<{
  /** Accessible name for the icon, for example "About LPOs". */
  label: string;
  children: React.ReactNode;
  /** Where the tip opens: beside the icon (default) or under it. */
  side?: keyof typeof SIDE_CLASS;
}>) {
  const tipId = useId();
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const visible = hovered || pinned;

  useEffect(() => {
    if (!pinned) {
      return;
    }
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setPinned(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setPinned(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [pinned]);

  return (
    <span
      ref={rootRef}
      className="relative inline-flex align-middle"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        aria-label={label}
        aria-describedby={tipId}
        aria-expanded={visible}
        className="info-tip-button cursor-help"
        onClick={() => setPinned((value) => !value)}
      >
        i
      </button>
      <span
        id={tipId}
        role="tooltip"
        className={`info-tip-box ${SIDE_CLASS[side]} ${visible ? "block" : "hidden"}`}
      >
        {children}
      </span>
    </span>
  );
}
