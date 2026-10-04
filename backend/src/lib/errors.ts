export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly errorName: string = 'HttpError'
  ) {
    super(message);
    this.name = errorName;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ConflictError extends HttpError {
  constructor(message = 'Resource already exists') {
    super(409, message, 'Conflict');
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = 'Unauthorized') {
    super(401, message, 'Unauthorized');
  }
}

export class NotFoundError extends HttpError {
  constructor(message = 'Resource not found') {
    super(404, message, 'Not Found');
  }
}

export class BadRequestError extends HttpError {
  constructor(message = 'Bad Request') {
    super(400, message, 'Bad Request');
  }
}
