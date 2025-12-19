import { z } from "zod";

export const idParam = z.object({ id: z.coerce.number().int().positive() });

export const paginationQuery = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional()
});

export const filterIds = z.object({
  departmentId: z.coerce.number().int().positive().optional(),
  fiscalYearId: z.coerce.number().int().positive().optional(),
  accountId: z.coerce.number().int().positive().optional()
});

export const dateRangeAndSort = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  sort: z.enum(["date_desc", "date_asc"]).optional()
});
