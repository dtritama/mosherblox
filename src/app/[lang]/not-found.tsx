import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { getI18n } from "@/i18n/get-dictionary";

export default async function NotFound() {
  const { locale, dict } = await getI18n();

  return (
    <section className="relative grid min-h-[80dvh] place-items-center overflow-hidden pt-16">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-grid mask-[radial-gradient(ellipse_at_center,black_20%,transparent_70%)]"
      />
      <Container className="relative text-center">
        <p className="text-highlight text-8xl font-extrabold sm:text-9xl">404</p>
        <h1 className="mt-4 text-2xl font-bold text-ink-900 sm:text-3xl">{dict.notFound.title}</h1>
        <p className="mt-2 text-ink-500">{dict.notFound.description}</p>
        <ButtonLink href={`/${locale}`} size="lg" className="mt-8">
          {dict.notFound.back}
        </ButtonLink>
      </Container>
    </section>
  );
}
