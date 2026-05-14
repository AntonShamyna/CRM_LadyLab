import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof BadRequestException) {
      const payload = exception.getResponse() as { message?: string[] | string };
      if (!Array.isArray(payload.message)) {
        response.status(HttpStatus.BAD_REQUEST).json({
          code: 'BAD_REQUEST',
          message: payload.message ?? exception.message,
        });
        return;
      }

      response.status(HttpStatus.BAD_REQUEST).json({
        code: 'VALIDATION_ERROR',
        message: 'Ошибка валидации',
        fields: payload.message,
      });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      const message =
        typeof payload === 'object' && payload !== null && 'message' in payload
          ? (payload as { message: string }).message
          : exception.message;

      response.status(status).json({
        code: exception.name,
        message,
      });
      return;
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Внутренняя ошибка сервера',
    });
  }
}
