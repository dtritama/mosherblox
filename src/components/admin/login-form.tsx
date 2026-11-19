"use client";

import { Loader2, LogIn } from "lucide-react";
import { useActionState, useId } from "react";

import { adminCopy } from "@/app/admin/copy";
import { inputClass } from "@/components/checkout/form-parts";
import { SubmitError } from "@/components/checkout/submit-error";
import { Button } from "@/components/ui/button";
import { loginAction, type LoginState } from "@/server/admin/actions";

const t = adminCopy.login;

export function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, {});
  const emailId = useId();
  const passwordId = useId();

  return (
    <form action={formAction} className="grid gap-4">
      <div>
        <label htmlFor={emailId} className="mb-1.5 block text-sm font-medium text-ink-700">
          {t.email}
        </label>
        <input
          id={emailId}
          name="email"
          type="email"
          autoComplete="username"
          required
          defaultValue={state.email}
          className={inputClass(state.error === "invalid")}
        />
      </div>
      <div>
        <label htmlFor={passwordId} className="mb-1.5 block text-sm font-medium text-ink-700">
          {t.password}
        </label>
        <input
          id={passwordId}
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass(state.error === "invalid")}
        />
      </div>
      <SubmitError message={state.error ? t.errors[state.error] : null} />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <LogIn className="size-4" aria-hidden="true" />
        )}
        {pending ? t.submitting : t.submit}
      </Button>
    </form>
  );
}
