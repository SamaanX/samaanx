"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useForm } from "react-hook-form";

import { Label } from "@/components/ui/label";
import { resetPasswordAction } from "@/features/auth/actions/reset-password";
import { AuthHeader } from "@/features/auth/components/auth-header";
import { FieldError, FormAlert } from "@/features/auth/components/form-alert";
import { LoadingButton } from "@/features/auth/components/loading-button";
import { PasswordInput } from "@/features/auth/components/password-input";
import {
  type ResetPasswordInput,
  resetPasswordSchema,
} from "@/features/auth/schemas/auth";

export function ResetPasswordForm() {
  const router = useRouter();
  const [formError, setFormError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: ResetPasswordInput) {
    setFormError(null);
    setSuccess(null);

    const result = await resetPasswordAction(values);

    if (!result.ok) {
      setFormError(result.error.message);
      return;
    }

    setSuccess("Password updated. Redirecting to sign in…");
    window.setTimeout(() => {
      router.replace("/login");
      router.refresh();
    }, 900);
  }

  return (
    <div>
      <AuthHeader
        title="Choose a new password"
        description="Use at least 8 characters with upper, lower, and a number."
      />

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormAlert message={formError} />
        <FormAlert message={success} tone="success" />

        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
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

        <LoadingButton type="submit" loading={isSubmitting}>
          Update password
        </LoadingButton>
      </form>
    </div>
  );
}
