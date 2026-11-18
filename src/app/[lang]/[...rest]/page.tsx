import { notFound } from "next/navigation";

/** Any unknown path under a locale (e.g. /id/abc) renders the localized not-found page. */
export default function CatchAllPage() {
  notFound();
}
