import { z } from "zod";

import { isAllowedInstitutionalEmail } from "@/lib/auth/permissions";
import { validatePasswordStrength } from "@/lib/validators/password";

const institutionalEmailSchema = z
  .string()
  .trim()
  .email("Please enter a valid email address")
  .refine(
    (email) => isAllowedInstitutionalEmail(email),
    "Only @binus.edu or @binus.ac.id emails are allowed",
  );

export const forgotPasswordSchema = z.object({
  email: institutionalEmailSchema,
});

export const resetPasswordSchema = z
  .object({
    password: z.string().min(1, "Password is required"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .superRefine((data, ctx) => {
    const result = validatePasswordStrength(data.password);

    if (!result.valid && result.message) {
      ctx.addIssue({
        code: "custom",
        message: result.message,
        path: ["password"],
      });
    }
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
