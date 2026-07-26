"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import * as React from "react";
import { useForm } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { forgotPasswordAction } from "@/features/auth/actions/forgot-password";
import { AuthFooter } from "@/features/auth/components/auth-footer";
import { AuthHeader } from "@/features/auth/components/auth-header";
import { FieldError, FormAlert } from "@/features/auth/components/form-alert";
import { LoadingButton } from "@/features/auth/components/loading-button";
import {
  type ForgotPasswordInput,
  forgotPasswordSchema,
} from "@/features/auth/schemas/auth";

export function ForgotPasswordForm() {
  const [formError, setFormError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ForgotPasswordInput) {
    setFormError(null);
    setSuccess(null);

    const result = await forgotPasswordAction(values);

    if (!result.ok) {
      setFormError(result.error.message);
      return;
    }

    setSuccess(
      "If an account exists for that email, a reset link is on the way.",
    );
  }

  return (
    <div>
      <AuthHeader
        title="Forgot password"
        description="Enter your email and we’ll send a secure reset link."
      />

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormAlert message={formError} />
        <FormAlert message={success} tone="success" />

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

        <LoadingButton type="submit" loading={isSubmitting}>
          Send reset link
        </LoadingButton>
      </form>

      <AuthFooter
        prompt="Remembered it?"
        linkHref="/login"
        linkLabel="Back to sign in"
      />
    </div>
  );
}
