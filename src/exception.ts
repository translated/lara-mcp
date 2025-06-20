class ServerException extends Error {
  code: number = -32603;

  constructor(message: string) {
    super(message);
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
  InvalidSessionIdError,
  InvalidRequestError,
  InvalidCredentialsError,
};
