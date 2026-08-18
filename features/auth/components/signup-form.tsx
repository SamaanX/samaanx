"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import * as React from "react";
import { useForm } from "react-hook-form";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUpAction } from "@/features/auth/actions/sign-up";
import { AuthDivider } from "@/features/auth/components/auth-divider";
import { AuthFooter } from "@/features/auth/components/auth-footer";
import { AuthHeader } from "@/features/auth/components/auth-header";
import { FieldError, FormAlert } from "@/features/auth/components/form-alert";
import { LoadingButton } from "@/features/auth/components/loading-button";
import { PasswordInput } from "@/features/auth/components/password-input";
import { SocialLoginButton } from "@/features/auth/components/social-login-button";
import {
  signUpFormSchema,
  type SignUpFormValues,
} from "@/features/auth/schemas/auth-forms";
import { markPushPromptPending } from "@/features/notifications/lib/push-session";
import { trackEvent } from "@/lib/analytics/events";

export function SignupForm() {
  const [formError, setFormError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpFormSchema),
    defaultValues: {
      displayName: "",
      email: "",
      password: "",
      confirmPassword: "",
      acceptTerms: false,
    },
  });

  const acceptTerms = watch("acceptTerms");

  async function onSubmit(values: SignUpFormValues) {
    setFormError(null);
    setSuccess(null);

    const result = await signUpAction({
      email: values.email,
      password: values.password,
      displayName: values.displayName,
    });

    if (!result.ok) {
      setFormError(result.error.message);
      return;
    }

    if (!result.data.sessionEstablished) {
      setSuccess("Account created. Check your email to confirm, then sign in.");
      return;
    }

    trackEvent("signup");
    markPushPromptPending();
    // Full navigation so marketplace layout re-reads the new auth cookies.
    window.location.assign("/?welcome=1&push=1");
  }

  return (
    <div>
      <AuthHeader
        title="Create your account"
        description="Join SamaanX to rent from people nearby — or earn from what you own."
      />

      <div className="space-y-4">
        <SocialLoginButton label="Sign up with Google" />
        <AuthDivider />

        <form
          className="space-y-4"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
          <FormAlert message={formError} />
          <FormAlert message={success} tone="success" />

          <div className="space-y-2">
            <Label htmlFor="displayName">Name</Label>
            <Input
              id="displayName"
              autoComplete="name"
              placeholder="Your name"
              aria-invalid={Boolean(errors.displayName)}
              className="h-12 rounded-xl text-base md:text-base"
              {...register("displayName")}
            />
            <FieldError message={errors.displayName?.message} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="you@email.com"
              aria-invalid={Boolean(errors.email)}
              className="h-12 rounded-xl text-base md:text-base"
              {...register("email")}
            />
            <FieldError message={errors.email?.message} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              invalid={Boolean(errors.password)}
              {...register("password")}
            />
            <FieldError message={errors.password?.message} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <PasswordInput
              id="confirmPassword"
              autoComplete="new-password"
              invalid={Boolean(errors.confirmPassword)}
              {...register("confirmPassword")}
            />
            <FieldError message={errors.confirmPassword?.message} />
          </div>

          <div className="space-y-1">
            <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl px-1 py-1">
              <Checkbox
                checked={acceptTerms}
                onCheckedChange={(checked) =>
                  setValue("acceptTerms", checked === true, {
                    shouldValidate: true,
                  })
                }
                className="mt-0.5"
                aria-invalid={Boolean(errors.acceptTerms)}
              />
              <span className="text-muted-foreground text-sm leading-relaxed">
                I agree to SamaanX&apos;s terms and understand that SamaanX is a
                connecting platform only.
              </span>
            </label>
            <FieldError message={errors.acceptTerms?.message} />
          </div>

          <LoadingButton type="submit" loading={isSubmitting}>
            Create account
          </LoadingButton>
        </form>

        <AuthFooter
          prompt="Already have an account?"
          linkHref="/login"
          linkLabel="Sign in"
        />
      </div>
    </div>
  );
}
