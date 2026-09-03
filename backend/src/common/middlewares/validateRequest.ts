import { NextFunction, Request, Response } from "express";
import { AnyZodObject, ZodError } from "zod";

interface RequestValidators {
  body?: AnyZodObject;
  query?: AnyZodObject;
  params?: AnyZodObject;
}

export const validateRequest =
  (validators: RequestValidators) =>
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (validators.body) {
        req.body = await validators.body.parseAsync(req.body);
      }
      if (validators.query) {
        req.query = (await validators.query.parseAsync(
          req.query,
        )) as Request["query"];
      }
      if (validators.params) {
        req.params = (await validators.params.parseAsync(
          req.params,
        )) as Request["params"];
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(error);
      } else {
        next(error);
      }
    }
  };
