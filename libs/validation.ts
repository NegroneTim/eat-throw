import { z } from 'zod'

export const userCreateSchema = z.object({
  user: z.string()
    .min(1, "Username is required")
    .max(50, "Username too long")
    .regex(/^[а-яА-ЯөүӨҮёЁa-zA-Z0-9_\s]+$/, "Username can only contain letters, numbers, underscores, and Cyrillic characters")
})

export const userUpdateSchema = z.object({
  dailyScore: z.union([
    z.number().min(0).max(1000000),
    z.string().regex(/^\d+$/, "Must be a valid number")
      .transform(val => parseInt(val, 10))
      .pipe(z.number().min(0).max(1000000))
  ]).optional(),
  zoos: z.number().min(0).max(1000000).optional(),
  ard: z.number().min(0).max(1000000).optional(),
  stats: z.object({
    hp: z.number().min(1).max(100),
    earning: z.number().min(1).max(100),
    maxCapacity: z.number().min(1).max(100),
  }).optional(),
}).refine(data => {
  return data.dailyScore !== undefined ||
    data.zoos !== undefined ||
    data.ard !== undefined ||
    data.stats !== undefined
}, {
  message: "At least one field must be provided for update"
});

export const prizeUpdateSchema = z.object({
  bet: z.number().min(0).max(1000000)
})