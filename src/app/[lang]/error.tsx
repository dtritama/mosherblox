"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { useI18n } from "@/i18n/i18n-provider";

const RELOAD_KEY = "mb.errorReload";
/** At most one automatic reload per minute, so a lasting error can't loop. */
const RELOAD_GAP_MS = 60_000;

/** true = go ahead (and remember it). Storage blocked → no automatic reload. */
function mayReload() {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY));
    if (Date.now() - last < RELOAD_GAP_MS) return false;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
    return true;
  } catch {
    return false;
  }
}

/**
 * Most errors here are a page file that failed to load (a dropped connection, or a tab opened before
 * a new deploy). React's `reset` can't fix those — the failed download stays failed — so recover with
 * a real reload: once by itself, then with the button.
 */
export default function ErrorPage({ error }: { error: Error & { digest?: string } }) {
  const { dict } = useI18n();

  useEffect(() => {
    console.error("[page error]", error);
    if (mayReload()) window.location.reload();
  }, [error]);

  return (
    <section className="grid min-h-[80dvh] place-items-center pt-16">
      <Container className="text-center">
        <h1 className="text-3xl font-bold text-ink-900">{dict.error.title}</h1>
        <p className="mt-2 text-ink-500">{dict.error.description}</p>
        <Button size="lg" className="mt-8" onClick={() => window.location.reload()}>
          {dict.error.retry}
        </Button>
      </Container>
    </section>
  );
}
