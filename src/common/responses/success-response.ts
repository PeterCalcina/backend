import { StandardResponse } from "../dto/response.dto";

export function successResponse<T>(data?: T, message = 'OK', status = 200): StandardResponse<T> {
  return { status, message, data };
}
