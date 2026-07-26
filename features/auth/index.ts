export {
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from "@/features/auth/schemas/auth";
export { ensureProfileForUser } from "@/features/auth/services/profile-sync";
export type {
  AuthActionError,
  AuthActionResult,
  AuthSessionSummary,
  ForgotPasswordInput,
  PublicProfile,
  RequireUserResult,
  ResetPasswordInput,
  SignInInput,
  SignUpInput,
} from "@/features/auth/types/exports";

/**
 * Server Actions live in `@/features/auth/actions`.
 * Import them only from Server Components / other server modules.
 */
