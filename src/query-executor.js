import { typeOf } from "./utils";

class OperationNotFoundError extends Error {
  constructor() {
    super("QueryExecutor: Nested query object must contain operation");
  }
}

class NoUndefinedError extends Error {
  constructor() {
    super("QueryExecutor: No undefined ");
  }
}

/**
 * @example { name: { like: "Joe"},  age: { lowwer: 25 }, location: "USA" }
 * */
export class QueryExecutor {
  constructor(query) {
    this.query = query;
    this.tokens = QueryExecutor.parseQuery(query);
    this.execute = this.execute.bind(this);
  }
  static typeOf = typeOf;

  static parseQuery = (query) => Object.entries(query);
  static like = (left, right) => left.indexOf(right) >= 0;
  static lowwer = (left, right) => left < right;
  static equal = (left, right) => left === right;

  static operations = [
    { id: "equal", method: QueryExecutor.equal },
    { id: "like", method: QueryExecutor.like },
    { id: "lowwer", method: QueryExecutor.lowwer },
  ];
  static findOperation = (id) =>
    QueryExecutor.operations.find((o) => o.id === id);

  execute(item) {
    for (const [key, right] of this.tokens) {
      const type = QueryExecutor.typeOf(right);
      if (type === "undefined") throw new NoUndefinedError();
      if (type !== "object") {
        const valid = QueryExecutor.equal(item[key], right);
        if (!valid) return false;
        continue;
      }

      for (const [operationName, value] of QueryExecutor.parseQuery(right)) {
        const operation = QueryExecutor.findOperation(operationName);
        if (!operation) throw new OperationNotFoundError();
        const valid = operation.method(item[key], value);
        if (!valid) return false;
      }
    }

    return true;
  }
}
