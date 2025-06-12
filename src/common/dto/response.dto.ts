export class StandardResponse<T = any> {
  status: number; // Status code HTTP (200, 400, 500, etc.)
  message: string;
  data?: T; // Optional data field for successful responses
}
