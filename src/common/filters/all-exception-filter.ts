// src/common/filters/all-exceptions.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { StandardResponse } from '../dto/response.dto';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);
  private readonly isProduction = process.env.NODE_ENV === 'production';

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let userFriendlyMessage = 'Un error inesperado ocurrió en el servidor.';
    let errorDetails: string | string[] | object = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        userFriendlyMessage = exceptionResponse;
        errorDetails = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const responseObject = exceptionResponse as any;

        // Caso 1: Errores de ValidationPipe (message es un array)
        if (responseObject.message && Array.isArray(responseObject.message)) {
          userFriendlyMessage =
            'La validación falló. Por favor, verifique los datos sean correctos.';
          errorDetails = responseObject.message;
        }
        // Caso 2: Mensaje personalizado (ej. { message: '...', technicalMessage: '...' })
        else if (responseObject.message) {
          // Asume que 'message' es el amigable
          userFriendlyMessage = responseObject.message;
          errorDetails =
            responseObject.technicalMessage ||
            responseObject.error ||
            responseObject.message;
        } else {
          errorDetails = responseObject;
        }
      }
    } else if (exception instanceof Error) {
      userFriendlyMessage = 'Ocurrió un error interno en el servidor.';
      errorDetails = exception.message;
      this.logger.error(
        `Unhandled Error: ${exception.message}`,
        exception.stack,
        request.url,
      );
    } else {
      userFriendlyMessage = 'Ocurrió un error inesperado.';
      errorDetails = 'Tipo de error desconocido.';
      this.logger.error(
        `Unknown Exception Type: ${JSON.stringify(exception)}`,
        null,
        request.url,
      );
    }

    let finalErrorPayload: string | string[] | object | undefined;

    if (status === HttpStatus.BAD_REQUEST && Array.isArray(errorDetails)) {
      finalErrorPayload = errorDetails; //Errores de la validación del DTO
    } else if (this.isProduction) {
      finalErrorPayload = undefined;
    } else {
      finalErrorPayload = errorDetails;
    }

    const finalResponse: StandardResponse<null> = {
      status: status,
      message: userFriendlyMessage,
      error: finalErrorPayload,
    };

    this.logger.error(
      `${userFriendlyMessage} - ${finalErrorPayload}`,
      null,
      request.url,
    );
    response.status(status).json(finalResponse);
  }
}
