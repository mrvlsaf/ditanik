"use client";

import { useId, useState } from "react";

/**
 * A small (i) icon that explains a term right where it appears. The tip shows
 * only while the pointer is over the icon. Open state is tracked in React
 * rather than CSS :hover so it behaves the same in every browser.
 */
export function InfoTip({
  label,
  children,
}: Readonly<{
  /** Accessible name for the icon, for example "About LPOs". */
  label: string;
  children: React.ReactNode;
}>) {
  const tipId = useId();
  const [hovered, setHovered] = useState(false);

  return (
    <span
      className="relative inline-flex align-middle"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span
        role="img"
        aria-label={label}
        aria-describedby={tipId}
        className="info-tip-button"
      >
        i
      </span>
      {/* Beside the icon on tablets and up; under it on phones, where there
          is no room to the right. */}
      <span
        id={tipId}
        role="tooltip"
        className={`info-tip-box left-0 sm:top-1/2 sm:left-full sm:ml-2 sm:-translate-y-1/2 ${
          hovered ? "block" : "hidden"
        }`}
      >
        {children}
      </span>
    </span>
  );
}
