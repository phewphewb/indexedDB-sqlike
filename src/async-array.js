const ARRAY_INTERVAL = 100;

export class AsyncArray extends Array {
  #interval = ARRAY_INTERVAL;

  interval(ms) {
    this.#interval = ms;
    return this;
  }

  [Symbol.asyncIterator]() {
    let i = 0;
    const interval = this.#interval;
    let time = Date.now();
    return {
      next: () => {
        const now = Date.now();
        const diff = now - time;
        if (diff > interval) {
          time = now;
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                value: this[i],
                done: i++ === this.length,
              });
            }, interval);
          });
        }

        return Promise.resolve({
          value: this[i],
          done: i++ === this.length,
        });
      },
    };
  }

  async find(method) {
    for await (const value of this) {
      const found = method(value);
      if (found) return found;
    }
  }

  async filter(method) {
    const result = new AsyncArray();
    for await (const value of this) {
      const found = method(value);
      if (found) result.push(value);
    }
    return result;
  }
}
