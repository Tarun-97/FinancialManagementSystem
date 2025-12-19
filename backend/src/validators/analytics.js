import { z } from "zod";

export const utilizationQuery = z.object({
  departmentId: z.coerce.number().int().positive().optional(),
  fiscalYearId: z.coerce.number().int().positive().optional()
});

export const monthlyQuery = utilizationQuery;

export const byTypeQuery = utilizationQuery;

export const topDepartmentsQuery = z.object({
  fiscalYearId: z.coerce.number().int().positive(),
  limit: z.coerce.number().int().min(1).max(50).optional()
});
