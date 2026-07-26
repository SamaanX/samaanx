import type { ListingFormValues } from "@/features/listings/schemas/listing";

export function resolveDepositFields(values: ListingFormValues): {
  depositType: ListingFormValues["depositType"];
  depositAmount: number | null;
  depositPercent: number | null;
} {
  switch (values.depositType) {
    case "FIXED":
      return {
        depositType: "FIXED",
        depositAmount: values.depositAmount ?? null,
        depositPercent: null,
      };
    case "PERCENTAGE":
      return {
        depositType: "PERCENTAGE",
        depositAmount: null,
        depositPercent: values.depositPercent ?? null,
      };
    default:
      return {
        depositType: "NONE",
        depositAmount: null,
        depositPercent: null,
      };
  }
}
