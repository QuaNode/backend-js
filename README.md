# backend-js [![Codacy Badge](https://app.codacy.com/project/badge/Grade/dc618343c99f4f57a83b2c3a7d5fac6c)](https://www.codacy.com/gh/QuaNode/backend-js/dashboard?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=QuaNode/backend-js&amp;utm_campaign=Badge_Grade)

![0_00](https://user-images.githubusercontent.com/3101473/227796079-0705dbd3-e3d0-4fdb-8cc3-5d4caa9d1447.png)

**Backend-js** is a layer built above `expressjs` and `socket.io` to enable the [Behaviours Framework](https://github.com/QuaNode/behaviours) for Node.js applications.

---

## 📦 Installation

```bash
npm install backend-js
```

---

## 🚀 Usage

### 🔧 Backend Initialization

```js
var backend = require('backend-js');
var App = backend.app(__dirname + '/behaviours', {
    path: '/api/v1',
    parser: 'json',
    port: 8383,
    origins: '*'
});
```

#### `var App = app(path, options)`

| Parameter             | Type    | Description                                                                                      |
|-----------------------|---------|--------------------------------------------------------------------------------------------------|
| `path`                | string  | Path to the behaviours directory.                                                                |
| `options`             | object  | App configuration options.                                                                       |
| `options.path`        | string  | Prefix path appended to the beginning of routes.                                                 |
| `options.parser`      | string  | Supports `json`, `text`, `raw`, or `urlencoded`. Parses request/response body accordingly.       |
| `options.parserOptions` | object | Options for [body-parser](https://github.com/expressjs/body-parser).                            |
| `options.port`        | number  | Port of the server.                                                                              |
| `options.origins`     | string  | Allowed AJAX origins (comma-separated or `"*"` for all).                                         |
| `options.static`      | object  | Options for serving [static files](https://expressjs.com/en/4x/api.html#express.static).        |
| `options.static.route`| string  | Virtual route for static content.                                                                |
| `options.static.path` | string  | Path to directory containing static files.                                                       |

| Returns | Type     | Description                                                                          |
|---------|----------|--------------------------------------------------------------------------------------|
| `App`   | function | Express app instance ([API reference](https://expressjs.com/en/4x/api.html#app)).    |

---

### 🧩 Model Definition

```js
var backend = require('backend-js');
var model = backend.model();
var User = model({
  name: 'User'
}, {
  username: String,
  password: String
});
```

#### `var ModelEntity = model(options, attributes, plugins)`

| Parameter         | Type               | Description                                                                                                      |
|-------------------|--------------------|------------------------------------------------------------------------------------------------------------------|
| `options`         | string \| object   | Model name or full configuration object.                                                                         |
| `options.name`    | string             | Name of the model.                                                                                               |
| `options.features`| object             | Custom model features passed to the [data access layer](#data-access).                                           |
| `options.query`   | array              | Default query represented by [QueryExpression](#query).                                                          |
| `attributes`      | object             | Schema attributes (String, Number, Date). Supports nested objects or arrays.                                     |
| `plugins`         | array              | Array of [mongoose plugins](https://www.npmjs.com/search?q=mongoose&page=1&ranking=optimal).                     |

| Returns      | Type     | Description                              |
|--------------|----------|------------------------------------------|
| `ModelEntity`| function | Constructor for the defined model entity. |

---

### 🔍 Query Builder

```js
var QueryExpression = backend.QueryExpression;
var ComparisonOperators = {
    EQUAL: '=',
    NE: '$ne'
};
var LogicalOperators = {
    AND: '$and',
    OR: '$or',
    NOT: '$not'
};
backend.setComparisonOperators(ComparisonOperators);
backend.setLogicalOperators(LogicalOperators);

var query = [
  new QueryExpression({
    fieldName: 'username',
    comparisonOperator: ComparisonOperators.EQUAL,
    fieldValue: 'name'
  }),
  new QueryExpression({
    fieldName: 'password',
    comparisonOperator: ComparisonOperators.EQUAL,
    fieldValue: 'pass',
    logicalOperator: LogicalOperators.AND,
    contextualLevel: 0
  })
];
```

#### `setComparisonOperators(operators)` / `setLogicalOperators(operators)`

| Parameter | Type   | Description                                                                 |
|-----------|--------|-----------------------------------------------------------------------------|
| `operators` | object | Key-value pairs mapping to database engine operators (used by data access). |

#### `var expression = new QueryExpression(options)`

| Parameter             | Type   | Description                                                                                     |
|-----------------------|--------|-------------------------------------------------------------------------------------------------|
| `options.fieldName`   | string | Field name in the model.                                                                        |
| `options.comparisonOperator` | string | Comparison operator (`=`, `$ne`, etc.).                                                   |
| `options.fieldValue`  | any    | Value to compare against the field.                                                             |
| `options.logicalOperator` | string | Logical operator (`$and`, `$or`, `$not`).                                                 |
| `options.contextualLevel` | number | Nesting level of conditions (for grouping).                                               |

| Returns     | Type   | Description                                                                 |
|-------------|--------|-----------------------------------------------------------------------------|
| `expression`| object | Query expression object used in queries.                                    |

---

### 🧱 Entity API

```js
var ModelEntity = backend.ModelEntity;
var entity = new ModelEntity({});
var model = entity.getObjectConstructor();
var schema = entity.getObjectAttributes();
var features = entity.getObjectFeatures();
var query = entity.getObjectQuery();
```

#### `var entity = new ModelEntity(features)`

| Parameter     | Type   | Description                                                                  |
|---------------|--------|------------------------------------------------------------------------------|
| `features`    | object | Special model functionalities passed to the [data access layer](#data-access).|

| Returns      | Type   | Description                        |
|--------------|--------|------------------------------------|
| `entity`     | object | Holds model metadata and schema.   |

**Entity Methods:**

- `getObjectConstructor()` – returns model constructor  
- `getObjectAttributes()` – returns schema fields  
- `getObjectFeatures()` – returns model features  
- `getObjectQuery()` – returns default query array

---

### ⚙️ Behaviour (API Unit)

```js
var getUsers = behaviour({
  name: 'GetUsers',
  version: '1',
  path: '/users',
  method: 'GET'
}, function(init) {
  return function() {
    var self = init.apply(this, arguments).self();
    self.begin('Query', function(key, businessController, operation) {
        operation
          .entity(new User())
          .append(true)
          .apply();
    });
  };
});
```

#### `var Behavior = behaviour(option, constructor)`

| Parameter     | Type     | Description                                                                 |
|---------------|----------|-----------------------------------------------------------------------------|
| `option`      | object   | API metadata (name, version, path, method, params, returns).                 |
| `constructor` | function | Business logic with database or response mapping functionality.              |

---

## 🧬 Data Access

Define your own **data access layer** like below:

```js
var backend = require('backend-js');

var ModelController = function () {
    self.removeObjects = function (queryExprs, entity, callback) {
        // do remove
    };
    self.addObjects = function (objsAttributes, entity, callback) {
        // do add new
    };
    self.getObjects = function (queryExprs, entity, callback) {
        // do select
    };
    self.save = function (callback, oldSession) {
        // do save
    };
};

ModelController.defineEntity = function (name, attributes) {
    // define entity
    return entity;
};

ModelController.prototype.constructor = ModelController;

backend.setModelController(new ModelController());
```

---

## 🚀 Starter Project

Explore the official starter to learn Backend-JS with examples:

🔗 [https://github.com/QuaNode/BeamJS-Start](https://github.com/QuaNode/BeamJS-Start)

---

## 📄 License

- [MIT](./LICENSE).
