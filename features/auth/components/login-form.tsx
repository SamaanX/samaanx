"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import * as React from "react";
import { useForm } from "react-hook-form";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInAction } from "@/features/auth/actions/sign-in";
import { AuthDivider } from "@/features/auth/components/auth-divider";
import { AuthFooter } from "@/features/auth/components/auth-footer";
import { AuthHeader } from "@/features/auth/components/auth-header";
import { FieldError, FormAlert } from "@/features/auth/components/form-alert";
import { LoadingButton } from "@/features/auth/components/loading-button";
import { PasswordInput } from "@/features/auth/components/password-input";
import { SocialLoginButton } from "@/features/auth/components/social-login-button";
import {
  signInFormSchema,
  type SignInFormValues,
} from "@/features/auth/schemas/auth-forms";
import { markPushPromptPending } from "@/features/notifications/lib/push-session";
import { trackEvent } from "@/lib/analytics/events";

export function LoginForm() {
  const searchParams = useSearchParams();
  const callbackError = searchParams.get("error");
  const nextPath = searchParams.get("next");

  const [formError, setFormError] = React.useState<string | null>(
    callbackError === "auth_callback"
      ? "Sign-in could not be completed. Please try again."
      : null,
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignInFormValues>({
    resolver: zodResolver(signInFormSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: true,
    },
  });

  const rememberMe = watch("rememberMe");

  async function onSubmit(values: SignInFormValues) {
    setFormError(null);
    const result = await signInAction({
      email: values.email,
      password: values.password,
    });

    if (!result.ok) {
      setFormError(result.error.message);
      return;
    }

    trackEvent("login");
    markPushPromptPending();
    const redirectTo =
      nextPath?.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/";
    // Full navigation so marketplace layout re-reads the new auth cookies.
    window.location.assign(redirectTo);
  }

  return (
    <div>
      <AuthHeader
        title="Welcome back"
        description="Sign in to rent items nearby or earn from what you own."
      />

      <div className="space-y-4">
        <SocialLoginButton />
        <AuthDivider />

        <form
          className="space-y-4"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
          <FormAlert message={formError} />

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="you@email.com"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "email-error" : undefined}
              className="h-12 rounded-xl text-base md:text-base"
              {...register("email")}
            />
            <FieldError id="email-error" message={errors.email?.message} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-brand-blue text-sm font-semibold underline-offset-4 transition-colors hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <PasswordInput
              id="password"
              autoComplete="current-password"
              invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? "password-error" : undefined}
              {...register("password")}
            />
            <FieldError
              id="password-error"
              message={errors.password?.message}
            />
          </div>

          <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-1">
            <Checkbox
              checked={rememberMe}
              onCheckedChange={(checked) =>
                setValue("rememberMe", checked === true, {
                  shouldValidate: true,
                })
              }
              aria-label="Keep me signed in"
            />
            <span className="text-muted-foreground text-sm">
              Keep me signed in on this device
            </span>
          </label>

          <LoadingButton type="submit" loading={isSubmitting}>
            Sign in
          </LoadingButton>
        </form>

        <AuthFooter
          prompt="New to SamaanX?"
          linkHref="/signup"
          linkLabel="Create an account"
        />
      </div>
    </div>
  );
}
