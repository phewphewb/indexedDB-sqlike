export class NotImplementedError extends Error {
  constructor(name) {
    super(`Not implemented yet ${name}`);
  }
}

export class MissingIdError extends Error {
  constructor() {
    super("DB: Missing ID");
  }
}
