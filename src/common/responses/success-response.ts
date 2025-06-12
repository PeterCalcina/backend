import { StandardResponse } from "../dto/response.dto";

/**
 * @description Retorna una respuesta exitosa con el mensaje y el estado especificados, por defecto el estado es 200 y el mensaje es 'OK'
 * @param data 
 * @param message 
 * @param status 
 * @returns StandardResponse<T>
 */
export function successResponse<T>(data?: T, message = 'OK', status = 200): StandardResponse<T> {
  return { status, message, data };
}
