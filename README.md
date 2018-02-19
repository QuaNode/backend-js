# backendjs

[![Codacy Badge](https://api.codacy.com/project/badge/Grade/f2f50320606542ffb89bc9fef79dbf3f)](https://www.codacy.com/app/quanode/backendjs?utm_source=github.com&utm_medium=referral&utm_content=quaNode/backendjs&utm_campaign=badger)

### **Code generation engine designed to understand user requirements.**

    Usually, code generators only focus on performing functions or do specific jobs based on some user requirements, But 

they missed the  important part if i want to continue developing what shall i do, start from beginning that's insane !!!

from other side when developing code from scratch you are obliged to follow a lot of standards and checklists to writing the clean code.

---

That's our backend.js engine idea goal "continuing development using that generated code" by making it standardized, usable,

readable and maintainable like if you coded it by yourself.

The relationship between user requirements and the code is always documented or just in the developer mind. Domain Driven

Design had put rules to strengthen this relationship by naming the variables based on the domain you're working on

**for example :-**

if you develop a system for a bank variables should be like this\(account, national\_id, client, ....\).

but no clear relation between requirements and the whole code, so the main goal "lead to continuing" can't be satisfied because

of this gap.

That's our new pattern Behavior Driven Design solve, inspired by Behavior Driven Development.

Also, Defining a standard interface to deal with any database operations regardless its engine

Integration became easier between backend and frontend with our SDKs

## Installation

```
npm install backend-js
```

## Usage

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

behaviour({

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

## Note

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



