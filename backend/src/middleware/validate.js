// Wrap zod schema parse; attach 400 on failure
export function validate(schema, source = "body") {
  return (req, _res, next) => {
    try {
      const data = req[source];
      const parsed = schema.parse(data);
      req[source] = parsed;
      return next();
    } catch (e) {
      const first = e?.issues?.[0];
      const message = first ? `${first.path?.join(".") || "payload"}: ${first.message}` : "Invalid request";
      return next({ status: 400, error: "ValidationError", message, details: e?.issues });
    }
  };
}
