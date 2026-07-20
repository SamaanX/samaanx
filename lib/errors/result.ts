import { AppError } from "@/lib/errors/app-error";

export type Ok<T> = {
  ok: true;
  data: T;
};

export type Err<E = AppError> = {
  ok: false;
  error: E;
};

export type Result<T, E = AppError> = Ok<T> | Err<E>;

export function ok<T>(data: T): Ok<T> {
  return { ok: true, data };
}

export function err<E = AppError>(error: E): Err<E> {
  return { ok: false, error };
}
