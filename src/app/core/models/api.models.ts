export interface ApiResponse<T> {
  statusCode: number;
  data: T;
  message?: string;
}

export interface ApiError {
  statusCode: number;
  error: string;
  message: string | string[];
  details?: unknown;
}
