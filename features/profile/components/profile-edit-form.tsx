"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import * as React from "react";
import { useForm } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateProfileAction } from "@/features/profile/actions/update-profile";
import {
  FieldError,
  FormMessage,
} from "@/features/profile/components/form-message";
import { LoadingButton } from "@/features/profile/components/loading-button";
import {
  BIO_MAX_LENGTH,
  updateProfileFormSchema,
  type UpdateProfileFormValues,
} from "@/features/profile/schemas/profile";
import type { ProfileViewModel } from "@/features/profile/types/profile";
import { cn } from "@/lib/utils";

type ProfileEditFormProps = {
  profile: ProfileViewModel;
  onProfileChange: (profile: ProfileViewModel) => void;
};

export function ProfileEditForm({
  profile,
  onProfileChange,
}: ProfileEditFormProps) {
  const [formError, setFormError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<UpdateProfileFormValues>({
    resolver: zodResolver(updateProfileFormSchema),
    defaultValues: {
      displayName: profile.displayName,
      phone: profile.phone ?? "",
      bio: profile.bio ?? "",
      city: profile.city ?? "",
      area: profile.area ?? "",
      preferredMode: profile.preferredMode,
    },
  });

  React.useEffect(() => {
    setValue("displayName", profile.displayName);
    setValue("phone", profile.phone ?? "");
    setValue("bio", profile.bio ?? "");
    setValue("city", profile.city ?? "");
    setValue("area", profile.area ?? "");
    setValue("preferredMode", profile.preferredMode);
  }, [profile, setValue]);

  const preferredMode = watch("preferredMode");
  const bioValue = watch("bio");

  async function onSubmit(values: UpdateProfileFormValues) {
    setFormError(null);
    setSuccess(null);

    const result = await updateProfileAction(values);

    if (!result.ok) {
      setFormError(result.error.message);
      return;
    }

    onProfileChange(result.data);
    setSuccess("Profile saved.");
  }

  return (
    <section
      aria-labelledby="edit-profile-heading"
      className="border-border/70 bg-card overflow-hidden rounded-[1.35rem] border shadow-[var(--rp-shadow-xs)] sm:rounded-[1.5rem]"
    >
      <div className="border-border/60 from-brand-blue-soft/70 via-card to-brand-green-soft/40 border-b bg-gradient-to-r px-4 py-4 sm:px-6">
        <h2
          id="edit-profile-heading"
          className="text-lg font-semibold tracking-tight"
        >
          Edit profile
        </h2>
        <p className="text-muted-foreground mt-0.5 text-sm">
          Keep your public details accurate for smoother rentals.
        </p>
      </div>

      <form
        className="space-y-5 px-4 py-5 sm:space-y-6 sm:px-6 sm:py-6"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <FormMessage message={formError} />
        <FormMessage message={success} tone="success" />

        <div className="space-y-4">
          <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            Basics
          </p>

          <div className="space-y-2">
            <Label htmlFor="displayName">Display name</Label>
            <Input
              id="displayName"
              autoComplete="name"
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
              value={profile.email}
              readOnly
              disabled
              className="h-12 rounded-xl text-base md:text-base"
            />
            <p className="text-muted-foreground text-xs">
              Managed by your sign-in account.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+92 300 1234567"
              aria-invalid={Boolean(errors.phone)}
              className="h-12 rounded-xl text-base md:text-base"
              {...register("phone")}
            />
            <FieldError message={errors.phone?.message} />
          </div>
        </div>

        <div className="border-border/60 space-y-4 border-t pt-5">
          <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            About & location
          </p>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="bio">Bio</Label>
              <span className="text-muted-foreground text-xs">
                {bioValue.length}/{BIO_MAX_LENGTH}
              </span>
            </div>
            <Textarea
              id="bio"
              rows={4}
              aria-invalid={Boolean(errors.bio)}
              className="min-h-28 rounded-xl text-base md:text-base"
              placeholder="Tell renters a little about yourself"
              {...register("bio")}
            />
            <FieldError message={errors.bio?.message} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                autoComplete="address-level2"
                aria-invalid={Boolean(errors.city)}
                className="h-12 rounded-xl text-base md:text-base"
                placeholder="Karachi"
                {...register("city")}
              />
              <FieldError message={errors.city?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="area">Area</Label>
              <Input
                id="area"
                aria-invalid={Boolean(errors.area)}
                className="h-12 rounded-xl text-base md:text-base"
                placeholder="Clifton"
                {...register("area")}
              />
              <FieldError message={errors.area?.message} />
            </div>
          </div>
        </div>

        <fieldset className="border-border/60 space-y-3 border-t pt-5">
          <legend className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            Preferred mode
          </legend>
          <p className="text-muted-foreground text-xs">
            Choose how you usually use SamaanX. You can still switch anytime.
          </p>
          <div
            className="border-border/70 bg-muted/50 grid grid-cols-2 gap-1 rounded-2xl border p-1"
            role="group"
            aria-label="Preferred mode"
          >
            {(["BUYER", "SELLER"] as const).map((mode) => {
              const selected = preferredMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={selected}
                  onClick={() =>
                    setValue("preferredMode", mode, { shouldValidate: true })
                  }
                  className={cn(
                    "focus-visible:ring-ring h-11 rounded-xl text-sm font-medium transition-all focus-visible:ring-2 focus-visible:outline-none",
                    selected
                      ? mode === "SELLER"
                        ? "bg-brand-green text-white shadow-[var(--rp-shadow-xs)]"
                        : "bg-brand-blue text-white shadow-[var(--rp-shadow-xs)]"
                      : "text-muted-foreground hover:bg-background/80 hover:text-foreground",
                  )}
                >
                  {mode === "BUYER" ? "Buyer" : "Seller"}
                </button>
              );
            })}
          </div>
          <FieldError message={errors.preferredMode?.message} />
        </fieldset>

        <LoadingButton type="submit" loading={isSubmitting} className="w-full">
          Save changes
        </LoadingButton>
      </form>
    </section>
  );
}
