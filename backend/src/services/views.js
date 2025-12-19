import { query } from "../config/db.js";

export async function listViews() {
  const items = await query(`
    SELECT 
      TABLE_NAME as viewName,
      VIEW_DEFINITION as definition,
      CHECK_OPTION as checkOption,
      IS_UPDATABLE as isUpdatable,
      DEFINER as definer,
      SECURITY_TYPE as securityType
    FROM information_schema.VIEWS
    WHERE TABLE_SCHEMA = DATABASE()
    ORDER BY TABLE_NAME
  `);
  return items;
}

export async function getViewDefinition(viewName) {
  const rows = await query(`
    SELECT 
      TABLE_NAME as viewName,
      VIEW_DEFINITION as definition,
      CHECK_OPTION as checkOption,
      IS_UPDATABLE as isUpdatable
    FROM information_schema.VIEWS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
  `, [viewName]);

  if (!rows[0]) throw { status: 404, message: `View '${viewName}' not found` };
  return rows[0];
}

export async function createView(viewName, selectQuery) {
  // Validate view name
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(viewName)) {
    throw { status: 400, message: 'Invalid view name. Use only letters, numbers, and underscores.' };
  }

  // Check if view already exists
  const existing = await query(`
    SELECT TABLE_NAME 
    FROM information_schema.VIEWS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
  `, [viewName]);

  if (existing.length > 0) {
    throw { status: 400, message: `View '${viewName}' already exists` };
  }

  // Create the view
  const createQuery = `CREATE VIEW ${viewName} AS ${selectQuery}`;
  await query(createQuery);

  return await getViewDefinition(viewName);
}

export async function dropView(viewName) {
  // Check if view exists
  const existing = await query(`
    SELECT TABLE_NAME 
    FROM information_schema.VIEWS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
  `, [viewName]);

  if (existing.length === 0) {
    throw { status: 404, message: `View '${viewName}' does not exist` };
  }

  await query(`DROP VIEW ${viewName}`);
}

export async function queryView(viewName, { limit, offset }) {
  // Verify view exists
  const viewCheck = await query(`
    SELECT TABLE_NAME 
    FROM information_schema.VIEWS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
  `, [viewName]);

  if (viewCheck.length === 0) {
    throw { status: 404, message: `View '${viewName}' does not exist` };
  }

  // Get total count
  const totalRow = await query(`SELECT COUNT(*) as c FROM ${viewName}`);
  const total = totalRow[0].c;

  // Get data
  const items = await query(`SELECT * FROM ${viewName} LIMIT ? OFFSET ?`, [limit, offset]);

  return { items, total, limit, offset };
}

export async function listProcedures() {
  const items = await query(`
    SELECT 
      ROUTINE_NAME as procedureName,
      ROUTINE_TYPE as routineType,
      DTD_IDENTIFIER as returnType,
      DEFINER as definer,
      CREATED as created,
      LAST_ALTERED as lastAltered,
      ROUTINE_COMMENT as comment
    FROM information_schema.ROUTINES
    WHERE ROUTINE_SCHEMA = DATABASE() AND ROUTINE_TYPE = 'PROCEDURE'
    ORDER BY ROUTINE_NAME
  `);
  return items;
}

export async function getProcedureDefinition(procedureName) {
  const rows = await query(`
    SELECT 
      ROUTINE_NAME as procedureName,
      ROUTINE_DEFINITION as definition,
      ROUTINE_COMMENT as comment,
      SQL_MODE as sqlMode
    FROM information_schema.ROUTINES
    WHERE ROUTINE_SCHEMA = DATABASE() 
      AND ROUTINE_NAME = ?
      AND ROUTINE_TYPE = 'PROCEDURE'
  `, [procedureName]);

  if (!rows[0]) {
    throw { status: 404, message: `Procedure '${procedureName}' not found` };
  }

  // Get parameters
  const params = await query(`
    SELECT 
      PARAMETER_NAME as parameterName,
      PARAMETER_MODE as mode,
      DATA_TYPE as dataType,
      CHARACTER_MAXIMUM_LENGTH as maxLength,
      ORDINAL_POSITION as position
    FROM information_schema.PARAMETERS
    WHERE SPECIFIC_SCHEMA = DATABASE() AND SPECIFIC_NAME = ?
    ORDER BY ORDINAL_POSITION
  `, [procedureName]);

  return { ...rows[0], parameters: params };
}

export async function createProcedure(procedureName, parameters, body) {
  // Validate procedure name
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(procedureName)) {
    throw { status: 400, message: 'Invalid procedure name. Use only letters, numbers, and underscores.' };
  }

  // Check if procedure already exists
  const existing = await query(`
    SELECT ROUTINE_NAME 
    FROM information_schema.ROUTINES
    WHERE ROUTINE_SCHEMA = DATABASE() 
      AND ROUTINE_NAME = ?
      AND ROUTINE_TYPE = 'PROCEDURE'
  `, [procedureName]);

  if (existing.length > 0) {
    throw { status: 400, message: `Procedure '${procedureName}' already exists` };
  }

  // Build parameter string
  const paramString = parameters || '';

  // Create the procedure
  const createQuery = `
    CREATE PROCEDURE ${procedureName}(${paramString})
    BEGIN
      ${body}
    END
  `;

  await query(createQuery);
  return await getProcedureDefinition(procedureName);
}

export async function dropProcedure(procedureName) {
  // Check if procedure exists
  const existing = await query(`
    SELECT ROUTINE_NAME 
    FROM information_schema.ROUTINES
    WHERE ROUTINE_SCHEMA = DATABASE() 
      AND ROUTINE_NAME = ?
      AND ROUTINE_TYPE = 'PROCEDURE'
  `, [procedureName]);

  if (existing.length === 0) {
    throw { status: 404, message: `Procedure '${procedureName}' does not exist` };
  }

  await query(`DROP PROCEDURE ${procedureName}`);
}

export async function callProcedure(procedureName, parameters = []) {
  // Verify procedure exists
  const procCheck = await query(`
    SELECT ROUTINE_NAME 
    FROM information_schema.ROUTINES
    WHERE ROUTINE_SCHEMA = DATABASE() 
      AND ROUTINE_NAME = ?
      AND ROUTINE_TYPE = 'PROCEDURE'
  `, [procedureName]);

  if (procCheck.length === 0) {
    throw { status: 404, message: `Procedure '${procedureName}' does not exist` };
  }

  // Build CALL statement
  const placeholders = parameters.map(() => '?').join(', ');
  const rows = await query(`CALL ${procedureName}(${placeholders})`, parameters);

  return rows;
}

export async function listTables() {
  const items = await query(`
    SELECT 
      TABLE_NAME as tableName,
      TABLE_TYPE as tableType,
      ENGINE as engine,
      TABLE_ROWS as rowCount,
      CREATE_TIME as created
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'
    ORDER BY TABLE_NAME
  `);
  return items;
}

export async function getTableColumns(tableName) {
  const rows = await query(`
    SELECT 
      COLUMN_NAME as columnName,
      DATA_TYPE as dataType,
      IS_NULLABLE as isNullable,
      COLUMN_KEY as columnKey,
      COLUMN_DEFAULT as defaultValue,
      EXTRA as extra,
      COLUMN_COMMENT as comment
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
    ORDER BY ORDINAL_POSITION
  `, [tableName]);

  if (rows.length === 0) {
    throw { status: 404, message: `Table '${tableName}' not found` };
  }

  return rows;
}
