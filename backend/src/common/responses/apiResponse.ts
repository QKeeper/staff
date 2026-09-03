import { Response } from "express";
import { ErrorDetail } from "../errors/appError.js";

export interface ApiResponseMeta {
  page?: number;
  limit?: number;
  total?: number;
  [key: string]: unknown;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: ApiResponseMeta;
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: ErrorDetail[];
}

export interface ApiErrorResponse {
  success: false;
  error: ApiErrorPayload;
}

export const sendSuccess = <T>(
  res: Response,
  data: T,
  meta?: ApiResponseMeta,
  statusCode = 200,
): Response => {
  const responseBody: ApiSuccessResponse<T> = {
    success: true,
    data,
    ...(meta ? { meta } : {}),
  };
  return res.status(statusCode).json(responseBody);
};

export const sendError = (
  res: Response,
  error: ApiErrorPayload,
  statusCode = 500,
): Response => {
  const responseBody: ApiErrorResponse = {
    success: false,
    error,
  };
  return res.status(statusCode).json(responseBody);
};
