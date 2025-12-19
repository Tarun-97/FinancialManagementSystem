import { z } from "zod";

export const departmentBody = z.object({
  StateID: z.coerce.number().int().positive(),
  DeptCode: z.string().min(1).max(50),
  DeptName: z.string().min(1).max(200),
  ParentDepartmentID: z.coerce.number().int().positive().optional().nullable()
});
