"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";

export type PageHeaderState = {
  title: string;
  description?: string;
};

type PageHeaderContextValue = {
  header: PageHeaderState;
  setHeader: (next: PageHeaderState) => void;
};

const PageHeaderContext = createContext<PageHeaderContextValue | null>(null);

export function PageHeaderProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [header, setHeaderState] = useState<PageHeaderState>({ title: "" });

  const setHeader = useCallback((next: PageHeaderState) => {
    setHeaderState(next);
  }, []);

  const value = useMemo(
    () => ({
      header,
      setHeader,
    }),
    [header, setHeader],
  );

  return (
    <PageHeaderContext.Provider value={value}>
      {children}
    </PageHeaderContext.Provider>
  );
}

export function usePageHeader() {
  const ctx = useContext(PageHeaderContext);
  if (!ctx) {
    throw new Error("usePageHeader must be used within PageHeaderProvider");
  }
  return ctx;
}

export function useOptionalPageHeader() {
  return useContext(PageHeaderContext);
}

/** Registers the current page title/description into the app header when present. */
export function useRegisterPageHeader(title: string, description?: string) {
  const ctx = useOptionalPageHeader();
  const setHeader = ctx?.setHeader;

  useLayoutEffect(() => {
    if (!setHeader) {
      return;
    }
    setHeader({ title, description });
    return () => {
      setHeader({ title: "" });
    };
  }, [title, description, setHeader]);

  return Boolean(ctx);
}
