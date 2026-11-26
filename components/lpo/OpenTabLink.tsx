import { TabLink } from "@/components/ui/TabLink";

/** A button-styled link that opens a tab on this LPO's page. */
export function OpenTabLink({
  lpoId,
  tab,
  className,
  children,
}: Readonly<{
  lpoId: string;
  tab: string;
  className?: string;
  children: React.ReactNode;
}>) {
  return (
    <TabLink href={`/lpo/${lpoId}?tab=${tab}`} className={className}>
      {children}
    </TabLink>
  );
}
