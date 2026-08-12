"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

export type ActionsMenuItem =
  | {
      kind: "button";
      id: string;
      label: string;
      onSelect: () => void;
      tone?: "default" | "danger";
      disabled?: boolean;
    }
  | {
      kind: "link";
      id: string;
      label: string;
      href: string;
      download?: boolean;
    };

type MenuCoords = {
  top: number;
  left: number;
};

function KebabIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5 fill-current">
      <circle cx="12" cy="5" r="1.75" />
      <circle cx="12" cy="12" r="1.75" />
      <circle cx="12" cy="19" r="1.75" />
    </svg>
  );
}

const MENU_MIN_WIDTH = 168;
const MENU_GAP = 4;

function coordsFromTrigger(
  trigger: HTMLElement,
  menuHeight: number,
  menuWidth: number,
): MenuCoords {
  const rect = trigger.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom;
  const openUpward =
    spaceBelow < menuHeight + MENU_GAP && rect.top > spaceBelow;

  let left = rect.right - menuWidth;
  left = Math.min(left, window.innerWidth - menuWidth - 8);
  left = Math.max(8, left);

  const top = openUpward
    ? Math.max(8, rect.top - menuHeight - MENU_GAP)
    : Math.min(rect.bottom + MENU_GAP, window.innerHeight - menuHeight - 8);

  return { top, left };
}

/** Three-dot overflow menu; portals above overflow containers so last rows stay usable. */
export function ActionsMenu({
  items,
  label = "Actions",
}: Readonly<{
  items: ActionsMenuItem[];
  label?: string;
}>) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<MenuCoords | null>(null);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      return;
    }

    function placeMenu() {
      const trigger = triggerRef.current;
      if (!trigger) {
        return;
      }
      const menu = menuRef.current;
      const menuWidth = Math.max(
        MENU_MIN_WIDTH,
        menu?.offsetWidth ?? MENU_MIN_WIDTH,
      );
      const menuHeight = menu?.offsetHeight ?? items.length * 42;
      setCoords(coordsFromTrigger(trigger, menuHeight, menuWidth));
    }

    placeMenu();
    // Remeasure after paint once real menu height is known.
    const raf = window.requestAnimationFrame(placeMenu);
    window.addEventListener("resize", placeMenu);
    window.addEventListener("scroll", placeMenu, true);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", placeMenu);
      window.removeEventListener("scroll", placeMenu, true);
    };
  }, [open, items.length]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (items.length === 0) {
    return null;
  }

  const itemClass =
    "flex w-full shrink-0 cursor-pointer items-center px-3 py-2.5 text-left text-sm whitespace-nowrap";

  function openMenu() {
    const trigger = triggerRef.current;
    if (trigger) {
      setCoords(
        coordsFromTrigger(trigger, items.length * 42, MENU_MIN_WIDTH),
      );
    }
    setOpen(true);
  }

  const menu =
    open && mounted && coords
      ? createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              minWidth: MENU_MIN_WIDTH,
              zIndex: 80,
            }}
            className="flex flex-col rounded-md border border-zinc-200 bg-white py-1 shadow-lg"
          >
            {items.map((item) => {
              if (item.kind === "link") {
                return (
                  <a
                    key={item.id}
                    href={item.href}
                    role="menuitem"
                    className={`${itemClass} text-zinc-800 hover:bg-zinc-50`}
                    onClick={() => setOpen(false)}
                  >
                    {item.label}
                  </a>
                );
              }

              const toneClass =
                item.tone === "danger"
                  ? "text-red-700 hover:bg-red-50"
                  : "text-zinc-800 hover:bg-zinc-50";

              return (
                <button
                  key={item.id}
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  className={`${itemClass} disabled:opacity-60 ${toneClass}`}
                  onClick={() => {
                    setOpen(false);
                    item.onSelect();
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => {
          if (open) {
            setOpen(false);
            return;
          }
          openMenu();
        }}
        className="inline-flex min-h-9 min-w-9 cursor-pointer items-center justify-center rounded-md border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
      >
        <KebabIcon />
      </button>
      {menu}
    </>
  );
}
