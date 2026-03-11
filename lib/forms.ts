import {z} from "zod";

const optionalTrimmedString = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}, z.string().min(2).optional());

const optionalLooseString = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}, z.string().optional());

const optionalPositiveNumber = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }

  return value;
}, z.coerce.number().int().positive().optional());

export const contactSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  subject: z.string().min(3),
  message: z.string().min(10)
});

export const customRequestSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  preferredLocale: z.enum(["en", "id"]),
  inspiration: z.string().min(12),
  requestedSize: optionalTrimmedString,
  budget: optionalPositiveNumber,
  currency: z.enum(["IDR", "USD", "GBP", "AUD", "SGD", "MYR"]),
  timeline: optionalLooseString,
  notes: optionalLooseString
});

