"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useFieldArray, useForm } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_COUNTRY_CODE } from "@/config/constants";
import {
  beginCreateListingAction,
  registerListingImagesAction,
  rollbackListingDraftAction,
  updateListingAction,
} from "@/features/listings/actions";
import {
  FieldError,
  FormMessage,
} from "@/features/listings/components/form-message";
import {
  draftImagesToFiles,
  draftImagesToKeepIds,
  type DraftListingImage,
  ListingImageUploader,
} from "@/features/listings/components/listing-image-uploader";
import { LoadingButton } from "@/features/listings/components/loading-button";
import {
  DESCRIPTION_MAX,
  listingFormSchema,
  type ListingFormValues,
  TITLE_MAX,
} from "@/features/listings/schemas/listing";
import { uploadListingImagesFromClient } from "@/features/listings/services/upload-listing-images-client";
import type {
  CategoryOption,
  SellerListingDetailView,
} from "@/features/listings/types/listing";
import { LazyLocationPicker } from "@/features/maps/components/lazy-location-picker";
import { trackEvent } from "@/lib/analytics/events";
import { cn } from "@/lib/utils";

function LazyLocationPickerGate(props: {
  lat: number;
  lng: number;
  onChange: (coords: { lat: number; lng: number }) => void;
}) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  if (!apiKey) {
    return (
      <p className="border-border text-muted-foreground rounded-xl border border-dashed px-3 py-2 text-xs">
        Map picker unavailable — set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.
        Coordinates can still be entered manually.
      </p>
    );
  }
  return <LazyLocationPicker apiKey={apiKey} {...props} />;
}

type ListingFormProps = {
  mode: "create" | "edit";
  categories: CategoryOption[];
  listing?: SellerListingDetailView;
  defaultCity?: string | null;
  defaultArea?: string | null;
  defaultLat?: number | null;
  defaultLng?: number | null;
};

function todayPlus(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function buildDefaults(
  listing: SellerListingDetailView | undefined,
  defaults: {
    city?: string | null;
    area?: string | null;
    lat?: number | null;
    lng?: number | null;
  },
): ListingFormValues {
  if (listing) {
    return {
      title: listing.title,
      description: listing.description,
      categoryId: listing.categoryId,
      rentPriceAmount: listing.rentPriceAmount,
      rentPriceUnit: listing.rentPriceUnit,
      depositType: listing.depositType,
      depositAmount: listing.depositAmount ?? undefined,
      depositPercent: listing.depositPercent ?? undefined,
      city: listing.city,
      area: listing.area,
      countryCode: listing.countryCode,
      lat: listing.lat,
      lng: listing.lng,
      showExactPickup: listing.showExactPickup,
      status: listing.status,
      availability:
        listing.availability.length > 0
          ? listing.availability.map((row) => ({
              type: row.type,
              startDate: row.startDate,
              endDate: row.endDate,
              notes: row.notes,
            }))
          : [
              {
                type: "AVAILABLE",
                startDate: todayPlus(0),
                endDate: todayPlus(30),
                notes: null,
              },
            ],
    };
  }

  return {
    title: "",
    description: "",
    categoryId: "",
    rentPriceAmount: 0,
    rentPriceUnit: "DAY",
    depositType: "NONE",
    depositAmount: undefined,
    depositPercent: undefined,
    city: defaults.city ?? "",
    area: defaults.area ?? "",
    countryCode: DEFAULT_COUNTRY_CODE,
    lat: defaults.lat ?? 24.8607,
    lng: defaults.lng ?? 67.0011,
    showExactPickup: false,
    status: "DRAFT",
    availability: [
      {
        type: "AVAILABLE",
        startDate: todayPlus(0),
        endDate: todayPlus(30),
        notes: null,
      },
    ],
  };
}

export function ListingForm({
  mode,
  categories,
  listing,
  defaultCity,
  defaultArea,
  defaultLat,
  defaultLng,
}: ListingFormProps) {
  const router = useRouter();
  const [images, setImages] = React.useState<DraftListingImage[]>(() =>
    (listing?.images ?? []).map((image) => ({
      key: image.id,
      kind: "existing" as const,
      id: image.id,
      previewUrl: image.url,
      progress: 100,
    })),
  );
  const [formError, setFormError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ListingFormValues>({
    resolver: zodResolver(listingFormSchema),
    defaultValues: buildDefaults(listing, {
      city: defaultCity,
      area: defaultArea,
      lat: defaultLat,
      lng: defaultLng,
    }),
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "availability",
  });

  const depositType = watch("depositType");
  const status = watch("status");
  const description = watch("description");
  const title = watch("title");

  async function onSubmit(values: ListingFormValues) {
    setFormError(null);
    setSuccess(null);

    if (images.length < 1) {
      setFormError("Add at least one photo.");
      return;
    }

    const newFiles = draftImagesToFiles(images);
    setUploading(true);
    setImages((current) =>
      current.map((image) => ({
        ...image,
        progress: image.kind === "new" ? 8 : 100,
      })),
    );

    try {
      if (mode === "create") {
        const begin = await beginCreateListingAction(values);
        if (!begin.ok) {
          setFormError(begin.error.message);
          return;
        }

        let uploaded;
        try {
          uploaded = await uploadListingImagesFromClient({
            listingId: begin.data.id,
            files: newFiles,
            onFileComplete: (completed, total) => {
              const ratio = Math.round((completed / total) * 100);
              setImages((current) => {
                let newIndex = 0;
                return current.map((image) => {
                  if (image.kind !== "new") {
                    return image;
                  }
                  newIndex += 1;
                  return {
                    ...image,
                    progress: newIndex <= completed ? ratio : image.progress,
                  };
                });
              });
            },
          });
        } catch (uploadError) {
          await rollbackListingDraftAction(begin.data.id);
          setFormError(
            uploadError instanceof Error
              ? uploadError.message
              : "Could not upload photos. Please try again.",
          );
          return;
        }

        const registered = await registerListingImagesAction(
          begin.data.id,
          uploaded,
        );

        if (!registered.ok) {
          await rollbackListingDraftAction(begin.data.id);
          setFormError(registered.error.message);
          return;
        }

        setImages((current) =>
          current.map((image) => ({ ...image, progress: 100 })),
        );
        trackEvent("create_listing", { listing_id: registered.data.id });
        router.replace(`/seller/listings/${registered.data.id}/edit`);
        return;
      }

      if (!listing) {
        setFormError("Listing not found.");
        return;
      }

      const keepImageIds = draftImagesToKeepIds(images);
      let newImages: Awaited<ReturnType<typeof uploadListingImagesFromClient>> =
        [];

      if (newFiles.length > 0) {
        try {
          newImages = await uploadListingImagesFromClient({
            listingId: listing.id,
            files: newFiles,
            startSortOrder: keepImageIds.length,
            onFileComplete: (completed, total) => {
              const ratio = Math.round((completed / total) * 100);
              setImages((current) => {
                let newIndex = 0;
                return current.map((image) => {
                  if (image.kind !== "new") {
                    return image;
                  }
                  newIndex += 1;
                  return {
                    ...image,
                    progress: newIndex <= completed ? ratio : image.progress,
                  };
                });
              });
            },
          });
        } catch (uploadError) {
          setFormError(
            uploadError instanceof Error
              ? uploadError.message
              : "Could not upload photos. Please try again.",
          );
          return;
        }
      }

      const result = await updateListingAction(listing.id, {
        payload: values,
        keepImageIds,
        newImages,
      });

      if (!result.ok) {
        setFormError(result.error.message);
        return;
      }

      setImages((current) =>
        current.map((image) => ({ ...image, progress: 100 })),
      );
      setSuccess("Listing updated.");
    } finally {
      setUploading(false);
    }
  }

  const createStatusOptions = [
    { value: "DRAFT", label: "Draft" },
    { value: "ACTIVE", label: "Publish now" },
  ] as const;

  const editStatusOptions = [
    { value: "DRAFT", label: "Draft" },
    { value: "ACTIVE", label: "Active" },
    { value: "PAUSED", label: "Paused" },
    { value: "SOLD_OUT", label: "Sold out" },
    { value: "ARCHIVED", label: "Archived" },
  ] as const;

  const statusOptions =
    mode === "create" ? createStatusOptions : editStatusOptions;

  return (
    <form className="space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate>
      <FormMessage message={formError} />
      <FormMessage message={success} tone="success" />

      <ListingImageUploader
        images={images}
        onChange={setImages}
        uploading={uploading || isSubmitting}
        disabled={isSubmitting}
      />

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="title">Title</Label>
          <span className="text-muted-foreground text-xs">
            {title.length}/{TITLE_MAX}
          </span>
        </div>
        <Input
          id="title"
          className="h-12 rounded-xl text-base md:text-base"
          aria-invalid={Boolean(errors.title)}
          {...register("title")}
        />
        <FieldError message={errors.title?.message} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="description">Description</Label>
          <span className="text-muted-foreground text-xs">
            {description.length}/{DESCRIPTION_MAX}
          </span>
        </div>
        <Textarea
          id="description"
          rows={5}
          className="min-h-32 rounded-xl text-base md:text-base"
          aria-invalid={Boolean(errors.description)}
          {...register("description")}
        />
        <FieldError message={errors.description?.message} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="categoryId">Category</Label>
        <select
          id="categoryId"
          className="border-input focus-visible:border-ring focus-visible:ring-ring/50 flex h-12 w-full rounded-xl border bg-transparent px-3 text-base outline-none focus-visible:ring-3"
          aria-invalid={Boolean(errors.categoryId)}
          {...register("categoryId")}
        >
          <option value="">Select a category</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <FieldError message={errors.categoryId?.message} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="rentPriceAmount">Rent price (PKR)</Label>
          <Input
            id="rentPriceAmount"
            type="number"
            inputMode="decimal"
            step="1"
            min="1"
            className="h-12 rounded-xl text-base md:text-base"
            aria-invalid={Boolean(errors.rentPriceAmount)}
            {...register("rentPriceAmount")}
          />
          <FieldError message={errors.rentPriceAmount?.message} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rentPriceUnit">Price unit</Label>
          <select
            id="rentPriceUnit"
            className="border-input focus-visible:border-ring focus-visible:ring-ring/50 flex h-12 w-full rounded-xl border bg-transparent px-3 text-base outline-none focus-visible:ring-3"
            {...register("rentPriceUnit")}
          >
            <option value="DAY">Per day</option>
            <option value="WEEK">Per week</option>
            <option value="MONTH">Per month</option>
          </select>
          <FieldError message={errors.rentPriceUnit?.message} />
        </div>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Deposit</legend>
        <div className="grid grid-cols-3 gap-2">
          {(["NONE", "FIXED", "PERCENTAGE"] as const).map((type) => (
            <button
              key={type}
              type="button"
              aria-pressed={depositType === type}
              className={cn(
                "h-11 rounded-xl border text-sm font-medium transition-colors",
                depositType === type
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:bg-muted",
              )}
              onClick={() =>
                setValue("depositType", type, { shouldValidate: true })
              }
            >
              {type === "NONE" ? "None" : type === "FIXED" ? "Fixed" : "%"}
            </button>
          ))}
        </div>
        {depositType === "FIXED" ? (
          <div className="space-y-2">
            <Label htmlFor="depositAmount">Deposit amount (PKR)</Label>
            <Input
              id="depositAmount"
              type="number"
              inputMode="decimal"
              min="1"
              className="h-12 rounded-xl text-base md:text-base"
              {...register("depositAmount")}
            />
            <FieldError message={errors.depositAmount?.message} />
          </div>
        ) : null}
        {depositType === "PERCENTAGE" ? (
          <div className="space-y-2">
            <Label htmlFor="depositPercent">Deposit percent</Label>
            <Input
              id="depositPercent"
              type="number"
              inputMode="decimal"
              min="1"
              max="100"
              className="h-12 rounded-xl text-base md:text-base"
              {...register("depositPercent")}
            />
            <FieldError message={errors.depositPercent?.message} />
          </div>
        ) : null}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            className="h-12 rounded-xl text-base md:text-base"
            {...register("city")}
          />
          <FieldError message={errors.city?.message} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="area">Area</Label>
          <Input
            id="area"
            className="h-12 rounded-xl text-base md:text-base"
            {...register("area")}
          />
          <FieldError message={errors.area?.message} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="countryCode">Country</Label>
          <Input
            id="countryCode"
            maxLength={2}
            className="h-12 rounded-xl text-base uppercase md:text-base"
            {...register("countryCode")}
          />
          <FieldError message={errors.countryCode?.message} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lat">Latitude</Label>
          <Input
            id="lat"
            type="number"
            step="any"
            className="h-12 rounded-xl text-base md:text-base"
            {...register("lat")}
          />
          <FieldError message={errors.lat?.message} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lng">Longitude</Label>
          <Input
            id="lng"
            type="number"
            step="any"
            className="h-12 rounded-xl text-base md:text-base"
            {...register("lng")}
          />
          <FieldError message={errors.lng?.message} />
        </div>
      </div>

      <LazyLocationPickerGate
        lat={Number(watch("lat")) || 24.8607}
        lng={Number(watch("lng")) || 67.0011}
        onChange={(coords) => {
          setValue("lat", coords.lat, {
            shouldDirty: true,
            shouldValidate: true,
          });
          setValue("lng", coords.lng, {
            shouldDirty: true,
            shouldValidate: true,
          });
        }}
      />

      <label className="border-border/80 bg-card flex items-start gap-3 rounded-2xl border px-4 py-3">
        <input
          type="checkbox"
          className="border-input mt-1 size-4 rounded"
          checked={Boolean(watch("showExactPickup"))}
          onChange={(e) =>
            setValue("showExactPickup", e.target.checked, {
              shouldDirty: true,
            })
          }
        />
        <span className="space-y-0.5">
          <span className="block text-sm font-medium">
            Show exact pickup location
          </span>
          <span className="text-muted-foreground block text-xs">
            Off by default. Buyers see an approximate area (~400m) plus
            area/city. Turn on only if you want the exact pin public.
          </span>
        </span>
      </label>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Availability</legend>
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="border-border/80 space-y-3 rounded-2xl border p-3"
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor={`availability.${index}.type`}>Type</Label>
                <select
                  id={`availability.${index}.type`}
                  className="border-input flex h-11 w-full rounded-xl border bg-transparent px-3 text-sm outline-none"
                  {...register(`availability.${index}.type`)}
                >
                  <option value="AVAILABLE">Available</option>
                  <option value="BLOCKED">Blocked</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`availability.${index}.startDate`}>Start</Label>
                <Input
                  id={`availability.${index}.startDate`}
                  type="date"
                  className="h-11 rounded-xl"
                  {...register(`availability.${index}.startDate`)}
                />
                <FieldError
                  message={errors.availability?.[index]?.startDate?.message}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`availability.${index}.endDate`}>End</Label>
                <Input
                  id={`availability.${index}.endDate`}
                  type="date"
                  className="h-11 rounded-xl"
                  {...register(`availability.${index}.endDate`)}
                />
                <FieldError
                  message={errors.availability?.[index]?.endDate?.message}
                />
              </div>
            </div>
            {fields.length > 1 ? (
              <ButtonLikeRemove onClick={() => remove(index)} />
            ) : null}
          </div>
        ))}
        <FieldError message={errors.availability?.message} />
        <button
          type="button"
          className="text-foreground text-sm font-medium underline-offset-4 hover:underline"
          onClick={() =>
            append({
              type: "AVAILABLE",
              startDate: todayPlus(0),
              endDate: todayPlus(7),
              notes: null,
            })
          }
        >
          Add another window
        </button>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Status</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={status === option.value}
              className={cn(
                "h-11 rounded-xl border text-sm font-medium",
                status === option.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:bg-muted",
              )}
              onClick={() =>
                setValue("status", option.value, { shouldValidate: true })
              }
            >
              {option.label}
            </button>
          ))}
        </div>
        <FieldError message={errors.status?.message} />
      </fieldset>

      <LoadingButton
        type="submit"
        loading={isSubmitting || uploading}
        className="w-full"
      >
        {mode === "create" ? "Create listing" : "Save changes"}
      </LoadingButton>
    </form>
  );
}

function ButtonLikeRemove({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-destructive text-sm underline-offset-4 hover:underline"
    >
      Remove window
    </button>
  );
}
