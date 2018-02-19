backendj

```

```

Code generation engine designed to understand user requirements.

```
Usually, code generators only focus on performing functions or do specific jobs based on some user requirements, but
```

they are missing the important part if i want to continue developing what shall I do ? start from beginning that's insane !

from the other side when developing code on your own from scratch you are obliged to follow a lot of standards and checklists to achieve the clean code.

That's the idea of our backend.js engine "continuing development using that generated code" by making it standardized, reusable,

readable and maintainable like if you coded it by yourself.

The relationship between user requirements and the code always exists in documentations or just in the developer mind. Domain Driven Design had put rules to strengthen this relationship by naming the code units based on the domain you're working on

**For example; in a banking system, the domain contains terminologies like Account, Transaction, etc... so you should use this for naming your code unites \(variables, classes, functions, etc... \).**

Despite that, there is no strong relation between requirements and the code. That where our goal "lead to continuing"  came from.

Our new pattern Behavior Driven Design that is inspired by Behavior Driven Development, solves this by many ways like defining a standard interface to deal with databases regardless its type also making front-end integration easier using our cross-platform SDK.

frontend with our SDKs

## Installation

```
npm install backend-js
```

## Usage

### model

```js
var model_name = model(options, attributes, plugins)
```

| parameter | type | description |
| :--- | :--- | :--- |
| options | string \|\| object | json object can contain name, query  or features. |
| attributes | json | json object describe model schema |
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

```js
var behaviour_name = behaviour(option, function(){});
```

| parameter | type | description |
| :--- | :--- | :--- |
| options | json | api configuration |
| constructor | function | logic function works by pipe                programming  do functions regardless its order |

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

## Data access layer

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

## ToDo

1. caching
2. enhance queue-map algorithm
3. add streams
4. add module for external integration



