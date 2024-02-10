export class Logger {
  static log({ message }) {
    console.log(message);
  }
}

class Log {
  constructor(message) {
    this.message = message;
  }
}

export class ConnectedMessage extends Log {
  constructor(name, version) {
    super(`DB: connected succesfully. Name: ${name} | Version: ${version}`);
  }
}

export class CantSaveMessage extends Log {
  constructor(type) {
    super(`DB: can not save this type of data to IndexedDB - ${type}`);
  }
}

export class UpgradingMessage extends Log {
  constructor() {
    super("DB: Upgrading");
  }
}

export class SeedingMessage extends Log {
  constructor(schema) {
    super(`DB: Seeding, schema: ${schema}`);
  }
}
