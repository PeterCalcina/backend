import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger
} from '@nestjs/common';
import { Request, Response } from 'express';
import { StandardResponse } from '../dto/response.dto';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let userFriendlyMessage = 'Un error inesperado ocurrió en el servidor.';
    let errorDetails: string | string[] | object = 'Internal Server Error';

    // 1. HttpExceptions
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        userFriendlyMessage = exceptionResponse;
        errorDetails = exceptionResponse;
      }
      // Si la respuesta de la excepción es un objeto (ej. ValidationPipe o respuesta de HttpException custom)
      else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObject = exceptionResponse as any; // Cast para acceder a propiedades

        if (responseObject.message && Array.isArray(responseObject.message)) {
          userFriendlyMessage = 'Validación falló. Por favor, verifique los datos sean correctos.';
          errorDetails = responseObject.message; // El array de mensajes de validación
        }
        else if (responseObject.message) {
          userFriendlyMessage = responseObject.message;
          errorDetails = responseObject.error || responseObject.message;
        }
        // Fallback si no tiene 'message' pero es un objeto
        else {
            errorDetails = responseObject;
        }
      }
    }
    // 2. Errores Genéricos
    else if (exception instanceof Error) {
      userFriendlyMessage = 'Ocurrió un error interno en el servidor.';
      errorDetails = exception.message;
      this.logger.error(`Unhandled Error: ${exception.message}`, exception.stack, request.url);
    }
    // 3. Cualquier otra cosa desconocida
    else {
      userFriendlyMessage = 'Ocurrió un error inesperado.';
      errorDetails = 'Tipo de error desconocido.';
      this.logger.error(`Unknown Exception Type: ${JSON.stringify(exception)}`, null, request.url);
    }

    const finalResponse: StandardResponse<null> = {
      status: status,
      message: userFriendlyMessage,
      error: errorDetails,
    };

    response.status(status).json(finalResponse);
  }
}