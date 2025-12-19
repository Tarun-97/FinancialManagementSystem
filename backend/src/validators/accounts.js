import { z } from "zod";

export const AccountTypeEnum = z.enum(["Revenue","Expense","Asset","Liability","Equity"]);

export const accountBody = z.object({
  AccountCode: z.string().min(1).max(50),
  AccountName: z.string().min(1).max(200),
  AccountType: AccountTypeEnum,
  EconomicClass: z.string().max(50).optional().nullable(),
  FunctionalClass: z.string().max(50).optional().nullable(),
  FundCode: z.string().max(50).optional().nullable()
});
