import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { StandardResponse } from '../dto/response.dto';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const responseObject = res as any;
        message = Array.isArray(responseObject.message)
          ? responseObject.message.join(', ')
          : responseObject.message || message;
      }
    }

    const errorResponse: StandardResponse = {
      status,
      message,
      data: null,
    };

    response.status(status).json(errorResponse);
  }
}
