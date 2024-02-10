import { typeOf, merge, parseEntries } from "./utils";
import { MissingIdError, NotImplementedError } from "./errors";
import {
  CantSaveMessage,
  ConnectedMessage,
  UpgradingMessage,
  Logger,
  SeedingMessage,
} from "./messages";
import { AsyncArray } from "./async-array";
import { QueryExecutor } from "./query-executor";

class IDBCom {
  constructor() {
    this.connection = null;
    this.config = null;
    this.updgrading = false;
  }

  static create = () => new IDBCom();
  static promisify(request) {
    return new Promise((resolve, reject) => {
      request.oncomplete = request.onsuccess = () => resolve(request.result);
      request.onabort = request.onerror = () => reject(request.error);
    });
  }

  static typeOf = typeOf;
  static parseEntries = parseEntries;
  static merge = merge;
  static keyNames = ["id", "key"];

  get connected() {
    return !!this.connection;
  }

  connect = async (config) => {
    this.config = config;
    const { name, version = 1, schemas } = config;
    const request = indexedDB.open(name, version);
    request.onupgradeneeded = this.upgrade;
    this.connection = await IDBCom.promisify(request);
    if (this.updgrading) await this.seed(schemas);
    Logger.log(new ConnectedMessage(name, version));
  };

  initialize = () => {};

  upgrade = async (event) => {
    Logger.log(new UpgradingMessage());
    this.updgrading = true;
    this.connection = event.target.result;
    if (event.oldVersion !== 0) throw NotImplementedError("migration"); // TODO implement migration
    const { schemas } = this.config;
    for (const schema of schemas) {
      this.table(schema);
    }
  };

  seed = async (schemas) => {
    const seeds = schemas.map((schema) => {
      Logger.log(new SeedingMessage(schema));
      const { data, name } = schema;
      return this.insert({ on: name, set: data });
    });
    await Promise.all(seeds);
    this.updgrading = false;
  };

  table = (schema) => {
    const { name, options, indexes } = schema;
    const store = this.connection.createObjectStore(name, options);
    if (indexes) this.index(store, indexes);
  };

  index = async (store, indexes) => {
    for (const index of indexes) {
      const { name, keyPath, options } = index;
      store.createIndex(name, keyPath, options);
    }
  };

  store = (name, mode) => {
    const transaction = this.connection.transaction(name, mode);
    return transaction.objectStore(name);
  };

  insert = async (query) => {
    const { on, set } = query;
    const store = this.store(on, "readwrite");
    const type = IDBCom.typeOf(set);
    if (type === "array") set.forEach((obj) => store.add(obj));
    else if (type === "object") store.add(set);
    else {
      Logger.log(new CantSaveMessage(type));
      store.transaction.close();
    }
    await IDBCom.promisify(store.transaction);
    return set;
  };

  getAll = async (store, limit) => {
    const request = store.getAll(undefined, limit);
    const all = await IDBCom.promisify(request);
    return new AsyncArray(...all).interval(100);
  };

  findByKey = async (store, id) => {
    const request = store.get(id);
    return await IDBCom.promisify(request);
  };

  findByRange = async (store, ranges, limit) => {
    const result = new AsyncArray().interval(100);
    for (const { start, end } of ranges) {
      const range = IDBKeyRange.bound(start, end);
      const request = store.openCursor(range);
      await new Promise((resolve) => {
        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (!cursor) return resolve(result);
          const data = cursor.value;
          const length = result.push(data);
          if (length === limit) return resolve(result);
          cursor.continue();
        };
      });
    }
    return result;
  };

  filter = async (items, where) => {
    const queryExecutor = new QueryExecutor(where);
    return await items.filter((item) => {
      return queryExecutor.execute(item);
    });
  };

  select = async (query) => {
    const { from, where, range, limit } = query;
    const store = this.store(from, "readwrite");
    if (range) {
      return await this.filter(await this.findByRange(store, range), where);
    }
    const filters = IDBCom.parseEntries(where);
    if (filters.length === 0) return await this.getAll(store, limit);
    if (filters.length === 1) {
      const [[key, value]] = filters;
      if (IDBCom.keyNames.includes(key)) {
        return await this.findByKey(store, value);
      }
    }
    return await this.filter(await this.getAll(store, limit), where);
  };

  update = async (query) => {
    const { on, where, set, merge } = query;
    const store = this.store(on, "readwrite");
    const id = where.key || where.id;
    let data = set;
    if (!id) throw new MissingIdError();
    if (merge) {
      const item = await IDBCom.promisify(store.get(id));
      data = IDBCom.merge(item, set);
    }
    await IDBCom.promisify(store.put(data));
    return data;
  };

  count = async (name) => {
    const store = this.store(name, "readwrite");
    return await IDBCom.promisify(store.count());
  };

  last = async (name) => {
    const store = this.store(name, "readwrite");
    const keys = await IDBCom.promisify(store.getAllKeys());
    const last = keys.pop();
    return last;
  };

  delete = async (query) => {
    const { on, where } = query;
    const store = this.store(on, "readwrite");
    const key = where.key || where.id;
    return await IDBCom.promisify(store.delete(key));
  };
}

export { IDBCom };
