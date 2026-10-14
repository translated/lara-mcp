class ServerException extends Error {
  code: number = -32603;

  constructor(message: string) {
    super(message);
  }
}

class InvalidCredentialsError extends ServerException {
  code: number = -32600;

  constructor() {
    super("Invalid credentials");
  }
}

class InvalidInputError extends ServerException {
  code: number = -32600;

  constructor(message: string) {
    super(message);
  }
}

export {
  ServerException,
  InvalidCredentialsError,
  InvalidInputError,
};
