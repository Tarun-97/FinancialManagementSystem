import { z } from "zod";

export const stateBody = z.object({
  StateName: z.string().min(1).max(200),
  ISOCode: z.string().min(1).max(10),
  ActiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  ActiveTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable()
});
