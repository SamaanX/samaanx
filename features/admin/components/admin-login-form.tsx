"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import * as React from "react";
import { useForm } from "react-hook-form";

import { SamaanXLogo } from "@/components/brand/samaanx-logo";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminSignInAction } from "@/features/admin/actions/admin-sign-in";
import { AuthHeader } from "@/features/auth/components/auth-header";
import { FieldError, FormAlert } from "@/features/auth/components/form-alert";
import { LoadingButton } from "@/features/auth/components/loading-button";
import { PasswordInput } from "@/features/auth/components/password-input";
import {
  signInFormSchema,
  type SignInFormValues,
} from "@/features/auth/schemas/auth-forms";

export function AdminLoginForm() {
  const [formError, setFormError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInFormValues>({
    resolver: zodResolver(signInFormSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: true,
    },
  });

  async function onSubmit(values: SignInFormValues) {
    setFormError(null);

    const result = await adminSignInAction({
      email: values.email,
      password: values.password,
    });

    if (!result.ok) {
      setFormError(result.error.message);
      return;
    }

    window.location.assign("/admin");
  }

  return (
    <div className="border-border/70 bg-card w-full max-w-md rounded-3xl border p-6 shadow-[var(--rp-shadow-lg)] sm:p-8">
      <div className="mb-6 flex justify-center">
        <SamaanXLogo href="/" priority className="[&_img]:h-8" />
      </div>

      <AuthHeader
        title="Admin sign in"
        description="Enter your admin credentials to access the control panel."
      />

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormAlert message={formError} />

        <div className="space-y-2">
          <Label htmlFor="admin-email">Email</Label>
          <Input
            id="admin-email"
            type="email"
            autoComplete="username"
            inputMode="email"
            placeholder="admin@yourdomain.com"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "admin-email-error" : undefined}
            className="h-12 rounded-xl text-base md:text-base"
            {...register("email")}
          />
          <FieldError id="admin-email-error" message={errors.email?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="admin-password">Password</Label>
          <PasswordInput
            id="admin-password"
            autoComplete="current-password"
            invalid={Boolean(errors.password)}
            aria-describedby={
              errors.password ? "admin-password-error" : undefined
            }
            {...register("password")}
          />
          <FieldError
            id="admin-password-error"
            message={errors.password?.message}
          />
        </div>

        <LoadingButton type="submit" loading={isSubmitting} className="w-full">
          Sign in to admin
        </LoadingButton>
      </form>

      <p className="text-muted-foreground mt-6 text-center text-sm">
        <Link
          href="/"
          className="text-brand-blue font-semibold underline-offset-4 hover:underline"
        >
          Back to marketplace
        </Link>
      </p>
    </div>
  );
}
