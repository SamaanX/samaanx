import { deleteListingAction } from "@/features/listings/actions/listing-status";
import { apiError, apiSuccess } from "@/lib/api/route-utils";
import { AppError } from "@/lib/errors/app-error";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const result = await deleteListingAction(id);

    if (!result.ok) {
      throw new AppError(result.error.message, {
        code: result.error.code,
        status: result.error.code === "NOT_FOUND" ? 404 : 400,
      });
    }

    return apiSuccess(result.data);
  } catch (error) {
    return apiError(error, { route: "DELETE /api/v1/seller/listings/[id]" });
  }
}
