import { redirect } from "next/navigation";

/** Convert to PDF now lives as a tab on the Documents page; old links land there. */
export default function ConvertToPdfPage() {
  redirect("/documents?tab=convert");
}
