# backendjs

### Made for code generation, designed to understand user requirements.

Usually, code generators always focus on performing functions or do specific jobs based on user requirements, but they are missing the important part if I want to continue developing what shall I do? start from the beginning that's insane! from the other side when developing code on your own from scratch you are obliged to follow a lot of standards and checklists to achieve that clean code.

That's the idea of our backend.js engine "continuing development using that generated code" by making it standardized, reusable, readable and maintainable as if you coded it by yourself.

The relationship between user requirements and the code always exists in documentation or just in the developer mind. Domain Driven Design had put rules to strengthen this relationship by naming the code units based on the domain you're working on.

##### For example; in a banking system, the domain contains terminologies like Account, Transaction, etc... so you should use this for naming your code units \(variables, classes, functions, etc... \).

Despite that, there is no strong relation between user requirements and the code that is where our goal "lead to continuing" came from.

Our new pattern [Behavior Driven Design](https://github.com/QuaNode/backendjs/wiki/Behavior-driven-design) that is inspired by Behavior Driven Development, solves this by many ways like defining a standard interface to deal with databases regardless its type also defining a language to write the higher level logic breaking that gap between code and user requirements.

## Installation

```
npm install backend-js
```

## Usage

### server

```js
var backend = require('backend-js');

backend.dbType = "mongodb";
backend.dbURI = "mongodb://user:password@host:port";
backend.dbName = "database name";

backend.app(__dirname + '/behaviours', {

    path: '/api/v1',
    parser: 'json',
    port: 8383,
    origins: '*'
});
```

##### database

| parameter | type | description |
| :--- | :--- | :--- |
| dbType | string | only mongodb is supported for now. |
| dbURI | string | mongodb [connection string](https://docs.mongodb.com/manual/reference/connection-string/). |

##### .app\(path, options\)

| parameter | type | description |
| :--- | :--- | :--- |
| path | string | path of behaviours directory. |
| options | object | app configurations object. |
| options.path | string | prefix path appended to the beginning of routes. |
| options.parser | string | if json, text, raw or urlencoded is used, the body of the request  will be parsed accordingly also the body of the response will be serialized accordingly. |
|  |  |  |
|  |  |  |
|  |  |  |
|  |  |  |
|  |  |  |

### model

model entity

```js
var Model = model(options, attributes, plugins)
```

| parameter | type | description |
| :--- | :--- | :--- |
| options | string \|\| object | object can contain name, query or features. |
| attributes | object | json object describes model schema |
| plugins | array | add more functionality on schema |

```js
var backend = require('backend-js');
var behaviour = backend.behaviour('/api/v1');

var model = backend.model();
var User = model({

  name: 'User'
}, {

  username: String,
  password: String
});
```

### behaviour

create an api

```js
var behaviour_name = behaviour(option, function(){});
```

| parameter | type | description |
| :--- | :--- | :--- |
| options | object | api configuration \(name, version, path, method, parameters, returns\) |
| constructor | function | logic function works by registering on methods to do functions regardless its orders, like \(database processor query, insert, delete or update\), data mapping to map returns of data to specific format or server error handling |

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

## data access

you should define your own data access layer like following

```js
var backend = require('backend-js');

var ModelController = function () {

    self.removeObjects = function (queryExprs, entity, callback) {

        // do remove
    };
    self.newObjects = function (objsAttributes, entity, callback) {

        // do add new
    };

    self.getObjects = function (queryExprs, entity, callback) {

        // do select
    };
    self.save = function (callback, oldSession) {

        // do select
    };
};

ModelController.defineEntity = function (name, attributes) {

    // define entity
    return entity;
};

ModelController.prototype.constructor = ModelController;

backend.setModelController(new ModelController());
```



