class ServerException extends Error {
  code: number = -32000;

  constructor(message: string) {
    super(message);
  }
}

class MethodNotFoundError extends ServerException {
  code: number = -32600;

  constructor() {
    super("Method not found");
  }
}

class InvalidSessionIdError extends ServerException {
  code: number = -32600;

  constructor() {
    super("Bad Request: No valid session ID provided");
  }
}

class InvalidRequestError extends ServerException {
  code: number = -32600;

  constructor() {
    super("Invalid request");
  }
}

class InvalidCredentialsError extends ServerException {
  code: number = -32600;

  constructor() {
    super("Invalid credentials");
  }
}

export {
  ServerException,
  MethodNotFoundError,
  InvalidSessionIdError,
  InvalidRequestError,
  InvalidCredentialsError,
};
