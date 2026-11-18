import { MousePointerClick } from "lucide-react";

import { Reveal } from "@/components/ui/reveal";
import { getI18n } from "@/i18n/get-dictionary";

export async function SelectGamePrompt() {
  const { dict } = await getI18n();
  const t = dict.gamepass.selectPrompt;

  return (
    <Reveal className="grid place-items-center rounded-[2rem] border-2 border-dashed border-brand-200 bg-brand-50/50 px-6 py-14 text-center">
      <span className="grid size-14 animate-float place-items-center rounded-2xl bg-brand-400 text-ink-900 shadow-lg shadow-brand-500/30">
        <MousePointerClick className="size-7" aria-hidden="true" />
      </span>
      <h2 className="mt-5 text-xl font-bold text-ink-900 sm:text-2xl">{t.title}</h2>
      <p className="mt-2 max-w-md text-sm text-ink-500 sm:text-base">{t.description}</p>
    </Reveal>
  );
}
