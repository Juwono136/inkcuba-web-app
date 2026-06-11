import { z } from "zod";

import { BINUS_CAMPUSES } from "@/lib/auth/constants";
import { isAllowedInstitutionalEmail } from "@/lib/auth/permissions";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  validatePasswordStrength,
} from "@/lib/validators/password";

const institutionalEmailSchema = z
  .string()
  .trim()
  .email("Please enter a valid email address")
  .refine(
    (email) => isAllowedInstitutionalEmail(email),
    "Only @binus.edu or @binus.ac.id emails are allowed",
  );

const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(PASSWORD_MAX_LENGTH, `Password must be at most ${PASSWORD_MAX_LENGTH} characters`)
  .superRefine((password, ctx) => {
    const result = validatePasswordStrength(password);

    if (!result.valid && result.message) {
      ctx.addIssue({
        code: "custom",
        message: result.message,
      });
    }
  });

export const signInSchema = z.object({
  email: institutionalEmailSchema,
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().default(false),
});

export const signUpSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Full name must be at least 2 characters")
      .max(100, "Full name must be at most 100 characters"),
    email: institutionalEmailSchema,
    binusianId: z
      .string()
      .trim()
      .min(5, "BINUSIAN ID must be at least 5 characters")
      .max(20, "BINUSIAN ID must be at most 20 characters")
      .regex(/^[a-zA-Z0-9]+$/, "BINUSIAN ID must be alphanumeric"),
    campus: z.enum(BINUS_CAMPUSES, {
      error: "Please select your campus",
    }),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
