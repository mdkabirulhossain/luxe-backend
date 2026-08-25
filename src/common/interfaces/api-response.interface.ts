/* eslint-disable prettier/prettier */
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiErrorResponse {
  success: boolean;
  statusCode: number;
  message: string;
  errors?: unknown[] | null;
  timestamp: string;
  path: string;
}
