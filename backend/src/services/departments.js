import { query } from "../config/db.js";
import { dynamicInsert, dynamicUpdate } from "./utils/dynamicSql.js";

const TABLE = "Departments";
const PK = "DepartmentID";

export async function listDepartments({ limit, offset }) {
  const items = await query(`SELECT * FROM ${TABLE} ORDER BY ${PK} ASC LIMIT ? OFFSET ?`, [limit, offset]);
  const totalRow = await query(`SELECT COUNT(*) as c FROM ${TABLE}`);
  return { items, total: totalRow[0].c, limit, offset };
}

export async function getDepartment(id) {
  const rows = await query(`SELECT * FROM ${TABLE} WHERE ${PK}=?`, [id]);
  return rows[0] || null;
}

export async function createDepartment(body) {
  if (body.ParentDepartmentID === "") body.ParentDepartmentID = null;
  const id = await dynamicInsert(TABLE, body, { skip: [PK] });
  return await getDepartment(id);
}

export async function updateDepartment(id, body) {
  if (body.ParentDepartmentID === "") body.ParentDepartmentID = null;
  await dynamicUpdate(TABLE, PK, id, body, { skip: [PK] });
  return await getDepartment(id);
}

export async function deleteDepartment(id) {
  await query(`DELETE FROM ${TABLE} WHERE ${PK}=?`, [id]);
}
