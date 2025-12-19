import { z } from "zod";

export const budgetBody = z.object({
  DepartmentID: z.coerce.number().int().positive(),
  FiscalYearID: z.coerce.number().int().positive(),
  AccountID: z.coerce.number().int().positive(),
  FundCode: z.string().min(1).max(50),
  ApprovedAmount: z.coerce.number().finite(),
  RevisedAmount: z.coerce.number().finite(),
  Notes: z.string().max(500).optional().nullable()
});
