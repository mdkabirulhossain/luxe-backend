/* eslint-disable prettier/prettier */
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { RESPONSE_MESSAGE_KEY } from '../decorators/response-message.decorator';

export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<unknown>> {
  constructor(private reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<unknown>> {
    const response = context.switchToHttp().getResponse<{ statusCode?: number }>();
    const statusCode = response.statusCode || HttpStatus.OK;

    // Check for custom response message via decorator
    const decoratorMessage = this.reflector.get<string>(
      RESPONSE_MESSAGE_KEY,
      context.getHandler(),
    );

    return next.handle().pipe(
      map((data: unknown) => {
        // If data is already in the standardized response format, return it directly
        if (
          data &&
          typeof data === 'object' &&
          'success' in data &&
          'statusCode' in data &&
          'message' in data
        ) {
          return data as ApiResponse<unknown>;
        }

        let message = decoratorMessage || 'Success';
        let responseData: unknown = data;

        // If returned data contains a message property, extract it as the response message
        if (data && typeof data === 'object') {
          const dataObj = data as Record<string, unknown>;
          if ('message' in dataObj && typeof dataObj.message === 'string') {
            message = dataObj.message;
            const rest = { ...dataObj };
            delete rest.message;
            // If there is no other data, set responseData to null, otherwise return the remaining keys
            responseData = Object.keys(rest).length > 0 ? rest : null;
          }
        }

        return {
          success: true,
          statusCode,
          message,
          data: responseData !== undefined ? responseData : null,
        };
      }),
    );
  }
}
