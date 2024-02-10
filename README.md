# IndexedDB SQLike

A class promysifying the IndexedDB API.

### Example

- Usage

```
  async create(data) => {
    await db.insert({
      on: "posts",
      set: data,
    });
  }
```

- Schema example

```
{
  name: "posts",
  options: { autoIncrement: false, keyPath: "id" },
  indexes: [
    { name: "userId", keyPath: "userId", unique: false },
    { name: "id", keyPath: "id", unique: true },
    { name: "createdAt", keyPath: "createdAt", unique: false },
  ],
};

```
