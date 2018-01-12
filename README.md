# backendjs

[![Codacy Badge](https://api.codacy.com/project/badge/Grade/f2f50320606542ffb89bc9fef79dbf3f)](https://www.codacy.com/app/quanode/backendjs?utm_source=github.com&utm_medium=referral&utm_content=quaNode/backendjs&utm_campaign=badger)

A node module that implements the behaviour-driven design and map-queue algorithm

## Installation

    npm install backend-js

## Usage

``` js

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

``` js

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
4. add module for external integrations

