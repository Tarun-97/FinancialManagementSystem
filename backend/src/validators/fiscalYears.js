import { z } from "zod";

export const fiscalYearBody = z.object({
  YearLabel: z.string().min(1).max(20),
  StartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  EndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  IsCurrent: z.boolean()
});
