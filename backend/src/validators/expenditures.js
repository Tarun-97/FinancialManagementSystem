import { z } from "zod";

export const expenditureBody = z.object({
  DepartmentID: z.coerce.number().int().positive(),
  FiscalYearID: z.coerce.number().int().positive(),
  AccountID: z.coerce.number().int().positive(),
  ExpenditureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  Amount: z.coerce.number().finite(),
  PaymentRef: z.string().max(100).optional().nullable(),
  Description: z.string().min(1).max(500)
});
