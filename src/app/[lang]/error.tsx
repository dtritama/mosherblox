"use client";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { useI18n } from "@/i18n/i18n-provider";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { dict } = useI18n();

  return (
    <section className="grid min-h-[80dvh] place-items-center pt-16">
      <Container className="text-center">
        <h1 className="text-3xl font-bold text-ink-900">{dict.error.title}</h1>
        <p className="mt-2 text-ink-500">{dict.error.description}</p>
        <Button size="lg" className="mt-8" onClick={reset}>
          {dict.error.retry}
        </Button>
      </Container>
    </section>
  );
}
