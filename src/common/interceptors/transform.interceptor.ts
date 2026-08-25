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
import { ApiResponse, PaginationMeta } from '../interfaces/api-response.interface';

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
        // If data is already in full standardized response format, return directly
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
        let responseMeta: PaginationMeta | undefined = undefined;

        if (data && typeof data === 'object' && !Array.isArray(data)) {
          const dataObj = { ...(data as Record<string, unknown>) };

          // Extract message if returned inside object and not overridden by decorator
          if ('message' in dataObj && typeof dataObj.message === 'string') {
            if (!decoratorMessage) {
              message = dataObj.message;
            }
            delete dataObj.message;
          }

          // Extract and elevate pagination meta if present
          if ('meta' in dataObj && dataObj.meta && typeof dataObj.meta === 'object') {
            const rawMeta = dataObj.meta as Record<string, unknown>;
            const total = Number(rawMeta.total ?? 0);
            const page = Number(rawMeta.page ?? 1);
            const limit = Number(rawMeta.limit ?? 10);
            const totalPages = Number(rawMeta.totalPages ?? (limit > 0 ? Math.ceil(total / limit) : 1));

            responseMeta = {
              total,
              page,
              limit,
              totalPages,
              hasNextPage: typeof rawMeta.hasNextPage === 'boolean' ? rawMeta.hasNextPage : page < totalPages,
              hasPreviousPage: typeof rawMeta.hasPreviousPage === 'boolean' ? rawMeta.hasPreviousPage : page > 1,
            };

            delete dataObj.meta;

            // If object contains `data` property alongside `meta`, elevate the inner `data`
            if ('data' in dataObj) {
              responseData = dataObj.data;
            } else {
              responseData = dataObj;
            }
          } else if ('message' in (data as Record<string, unknown>)) {
            responseData = Object.keys(dataObj).length > 0 ? dataObj : null;
          }
        }

        const result: ApiResponse<unknown> = {
          success: true,
          statusCode,
          message,
          data: responseData !== undefined ? responseData : null,
        };

        if (responseMeta) {
          result.meta = responseMeta;
        }

        return result;
      }),
    );
  }
}

