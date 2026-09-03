export class SignupInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SignupInputError";
  }
}

export class SignupUnavailableError extends Error {
  readonly status = 503;

  constructor() {
    super("Unable to create an account right now. Please try again.");
    this.name = "SignupUnavailableError";
  }
}
