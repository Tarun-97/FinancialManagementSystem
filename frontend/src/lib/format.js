// frontend/src/lib/format.js
import dayjs from "dayjs";

export function formatMoney(value) {
  if (value === null || value === undefined || isNaN(value)) return "—";
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 })
    .format(Number(value));
}

export function formatDate(value) {
  if (!value) return "—";
  return dayjs(value).format("YYYY-MM-DD");
}

export function normalizeCell(value, type) {
  if (value === null || value === undefined) return "";
  switch ((type || "").toLowerCase()) {
    case "int":
    case "bigint":
    case "tinyint":
    case "smallint":
    case "mediumint":
    case "decimal":
    case "float":
    case "double":
    case "numeric":
      return Number.isFinite(Number(value)) ? Number(value) : String(value);
    case "date":
    case "datetime":
    case "timestamp":
      try {
        const d = new Date(value);
        return isNaN(d.getTime()) ? String(value) : d.toISOString().replace("T", " ").slice(0, 19);
      } catch {
        return String(value);
      }
    case "json":
      try {
        return typeof value === "string" ? JSON.stringify(JSON.parse(value)) : JSON.stringify(value);
      } catch {
        return String(value);
      }
    default:
      return String(value);
  }
}

// Apply a mapper object like { "Amount":"decimal", "CreatedAt":"datetime" }
export function normalizeRow(row, typeMap = {}) {
  const out = {};
  Object.keys(row || {}).forEach(k => {
    const t = typeMap[k] || "";
    out[k] = normalizeCell(row[k], t);
  });
  return out;
}
