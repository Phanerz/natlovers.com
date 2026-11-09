// Failure logging that never carries customer data. Database and email errors can quote the query
// parameters or the address they were given (a name, phone, street, email), so only the kind of
// error is logged, never its message, its query or its parameters.

// "PostgresError 22P02", "Error", "TypeError": the class and, for database errors, the SQLSTATE.
export function errorType(error: unknown): string {
  if (error && typeof error === "object") {
    const e = error as {name?: unknown; code?: unknown; cause?: unknown};
    const cause = e.cause && typeof e.cause === "object" ? (e.cause as {code?: unknown}) : null;
    const code = typeof e.code === "string" ? e.code : typeof cause?.code === "string" ? cause.code : null;
    const name = typeof e.name === "string" && e.name ? e.name : "Error";
    return code ? `${name} ${code}` : name;
  }
  return typeof error;
}

export function logFailure(label: string, error: unknown, orderRef?: string): void {
  console.error(`${label}${orderRef ? ` (order ${orderRef})` : ""}: ${errorType(error)}`);
}
