import { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { AppError } from "../errors/appError.js";
import { sendError } from "../responses/apiResponse.js";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  // 1. Zod Validation Errors
  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
      rule: issue.code,
    }));

    sendError(
      res,
      {
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        details,
      },
      400,
    );
    return;
  }

  // 2. Custom AppErrors (BadRequest, Unauthorized, Conflict, etc.)
  if (err instanceof AppError) {
    sendError(
      res,
      {
        code: err.code,
        message: err.message,
        details: err.details,
      },
      err.statusCode,
    );
    return;
  }

  // 3. Prisma Known Request Errors
  if (err?.name === "PrismaClientKnownRequestError") {
    // P2002: Unique constraint failed
    if (err.code === "P2002") {
      const target = Array.isArray(err.meta?.target)
        ? err.meta.target.join(", ")
        : (err.meta?.target as string) || "field";

      sendError(
        res,
        {
          code: "CONFLICT",
          message: `Resource with this ${target} already exists`,
          details: [{ field: String(target), message: "Already exists" }],
        },
        409,
      );
      return;
    }

    // P2025: Record not found
    if (err.code === "P2025") {
      sendError(
        res,
        {
          code: "NOT_FOUND",
          message: "Requested record not found",
        },
        404,
      );
      return;
    }
  }

  // 4. JWT Errors
  if (err?.name === "JsonWebTokenError") {
    sendError(
      res,
      {
        code: "UNAUTHORIZED",
        message: "Invalid token",
      },
      401,
    );
    return;
  }

  if (err?.name === "TokenExpiredError") {
    sendError(
      res,
      {
        code: "TOKEN_EXPIRED",
        message: "Token has expired",
      },
      401,
    );
    return;
  }

  // 5. Syntax Error (e.g. malformed JSON in request body)
  if (err instanceof SyntaxError && "body" in err) {
    sendError(
      res,
      {
        code: "BAD_REQUEST",
        message: "Malformed JSON payload in request body",
      },
      400,
    );
    return;
  }

  // 6. Unknown / Unhandled Error
  console.error("Unhandled error:", err);
  sendError(
    res,
    {
      code: "INTERNAL_SERVER_ERROR",
      message:
        process.env.NODE_ENV === "production"
          ? "An unexpected error occurred"
          : err?.message || "Internal server error",
    },
    500,
  );
};
