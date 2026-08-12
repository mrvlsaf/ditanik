/** Shared panda-face brand mark (logo + UI). */
export function PandaMark({
  className = "h-8 w-8",
  title,
}: Readonly<{
  className?: string;
  title?: string;
}>) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {title ? <title>{title}</title> : null}
      {/* Face */}
      <circle cx="32" cy="33" r="24" fill="#f4f4f2" />
      {/* Ears */}
      <circle cx="12" cy="14" r="10" fill="#141414" />
      <circle cx="52" cy="14" r="10" fill="#141414" />
      {/* Eye patches */}
      <ellipse cx="21" cy="32" rx="10" ry="12" fill="#141414" />
      <ellipse cx="43" cy="32" rx="10" ry="12" fill="#141414" />
      {/* Eyes */}
      <circle cx="21" cy="32" r="3.6" fill="#f4f4f2" />
      <circle cx="43" cy="32" r="3.6" fill="#f4f4f2" />
      <circle cx="22.2" cy="32.6" r="1.5" fill="#141414" />
      <circle cx="44.2" cy="32.6" r="1.5" fill="#141414" />
      {/* Nose */}
      <ellipse cx="32" cy="42" rx="4.2" ry="3" fill="#1f8a4c" />
      {/* Muzzle line */}
      <path
        d="M32 45v5.5M27.5 49.5c2.2 2 6.8 2 9 0"
        fill="none"
        stroke="#141414"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Large panda face for login brand moments (face only). */
export function PandaHero({
  className = "h-40 w-40",
}: Readonly<{
  className?: string;
}>) {
  return <PandaMark className={className} />;
}
