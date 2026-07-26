import { z } from "zod";

import { emailSchema, passwordSchema } from "@/features/auth/schemas/auth";

/** UI-only signup schema — maps to backend signUpAction fields after validation. */
export const signUpFormSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters")
      .max(80, "Name is too long"),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your password"),
    acceptTerms: z.boolean().refine((value) => value === true, {
      message: "Please accept the terms to continue",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const signInFormSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean(),
});

export type SignUpFormValues = z.infer<typeof signUpFormSchema>;
export type SignInFormValues = z.infer<typeof signInFormSchema>;
