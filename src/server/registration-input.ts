import { z } from "zod";
import { passwordError } from "../lib/password-policy.ts";
export const registrationInput = z
  .object({
    name: z.string().trim().min(2).max(120),
    email: z
      .string()
      .trim()
      .email()
      .max(254)
      .transform((v) => v.toLowerCase()),
    password: z.string().max(200),
    confirmPassword: z.string().max(200),
    accountType: z.enum(["listener", "artist"]).default("listener"),
    artistName: z.string().trim().max(120).optional(),
    country: z.string().trim().max(100).optional(),
    primaryGenre: z.string().trim().max(100).optional(),
    acceptTerms: z.boolean().optional(),
    location: z.string().trim().max(200).optional(),
    bio: z.string().trim().max(3000).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    const error = passwordError(data.password);
    if (error) ctx.addIssue({ code: "custom", path: ["password"], message: error });
    if (data.password !== data.confirmPassword)
      ctx.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Passwords do not match.",
      });
    if (
      data.accountType === "artist" &&
      (!data.artistName || !data.country || !data.primaryGenre || data.acceptTerms !== true)
    )
      ctx.addIssue({
        code: "custom",
        message: "Complete your artist details and accept the upload terms.",
      });
  });
export type Registration = z.infer<typeof registrationInput>;
