/* eslint-disable prettier/prettier */
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

export interface ApiErrorResponse {
  success: boolean;
  statusCode: number;
  message: string;
  errors?: unknown[] | null;
  timestamp: string;
  path: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HttpExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal Server Error';
    let errors: unknown[] | null = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as Record<string, unknown>;
        const resMessage = responseObj.message;
        const resErrors = responseObj.errors;

        if (Array.isArray(resErrors)) {
          errors = resErrors as unknown[];
          message = typeof resMessage === 'string' ? resMessage : 'Validation failed';
        } else if (Array.isArray(resMessage)) {
          // Fallback if message is an array of strings (default ValidationPipe behavior)
          message = 'Validation failed';
          errors = resMessage as unknown[];
        } else {
          message = typeof resMessage === 'string' ? resMessage : exception.message;
        }
      } else {
        message = exception.message || String(exceptionResponse);
      }
    } else {
      // Unhandled generic Error (e.g. database disconnect, runtime TypeError, etc.)
      const errorMsg = exception instanceof Error ? exception.message : String(exception);
      const errorStack = exception instanceof Error ? exception.stack : undefined;
      
      this.logger.error(
        `Unhandled Exception on ${request.method} ${request.url}: ${errorMsg}`,
        errorStack,
      );
    }

    const errorResponse: ApiErrorResponse = {
      success: false,
      statusCode: status,
      message,
      errors: errors || null,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(status).json(errorResponse);
  }
}
