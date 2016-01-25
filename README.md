# backendjs
A node module that implements the behaviour-driven design and map-queue algorithm

## Installation

    npm install backend-js

## Usage

``` js

var express = require('express');
var app = express();

var backend = require('backend-js')(app);
var model = backend.model();
var behaviour = backend.behaviour('/api/v1');

var User = model({
  name : 'User'
}, {
  username : String
});

behaviour({
  name : 'GetUser',
  version : '1',
  path : '/user'
}, function (init) {

    return function () {

        var self = init.apply(this, arguments).self();
        self.begin('QUERY', function (key, businessController, operation) {

            var queryExpressions = [new QueryExpression({

                fieldName: 'username',
                comparisonOperator: ComparisonOperators.EQUAL,
                fieldValue: 'test'
            })];
            operation
                .query(queryExpressions)
                .entity(new User())
                .apply();
        })
    };
});

```
## Note

you should define your own data access layer like following

``` js

var backend = require('backend-js')();

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


