/** Typed, actionable errors. The message tells the agent (and the human) what to do next. */
export type ErrorCode =
  | "AUTH_EXPIRED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "ENDPOINT_CHANGED"
  | "UPSTREAM_ERROR"
  | "CONFIG_ERROR"
  | "BAD_INPUT"
  | "CHOOSE_OA"
  | "ATTACHMENT_EXPIRED"
  | "ATTACHMENT_TOO_LARGE"
  | "SEND_DISABLED"
  | "SEND_UNCERTAIN";

export class LineOAError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly retryAfterSec?: number,
  ) {
    super(message);
    this.name = "LineOAError";
  }
}

export const authExpired = () =>
  new LineOAError(
    "AUTH_EXPIRED",
    "The LINE OA session is missing or expired. Ask the CS person to run `npm run login`, then retry.",
  );
