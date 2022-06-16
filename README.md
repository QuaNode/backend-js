# backend-js [![Known Vulnerabilities](https://snyk.io/test/github/QuaNode/backendjs/badge.svg?targetFile=package.json)](https://snyk.io/test/github/QuaNode/backendjs?targetFile=package.json) [![Codacy Badge](https://app.codacy.com/project/badge/Grade/dc618343c99f4f57a83b2c3a7d5fac6c)](https://www.codacy.com/gh/QuaNode/backend-js/dashboard?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=QuaNode/backend-js&amp;utm_campaign=Badge_Grade)

Backend-js is a layer built above expressjs to enable [behaviours framework](https://github.com/QuaNode/behaviours) for nodejs applications.

## Installation

```
npm install backend-js
```

## Usage

### backend

```js
var backend = require('backend-js');
var App = backend.app(__dirname + '/behaviours', {
    path: '/api/v1',
    parser: 'json',
    port: 8383,
    origins: '*'
});
```

##### var App = app\(path, options\)

| parameter | type | description |
| :--- | :--- | :--- |
| path | string | path of behaviours directory. |
| options | object | app configurations object. |
| options.path | string | prefix path appended to the beginning of routes. |
| options.parser | string | if json, text, raw or urlencoded is used, the body of the request  will be parse accordingly also the body of the response will be serialized accordingly. |
| options.parserOptions | object | options for [parser](https://github.com/expressjs/body-parser). |
| options.port | number | port of server. |
| options.origins | string | comma separated domains allowed to send ajax requests to this server or **"\*"** to allow any. |
| options.static | object | options object to define [static served](https://expressjs.com/en/4x/api.html#express.static) files. |
| options.static.route | string | virtual path/route for static served files. |
| options.static.path | string | relative path of the directory of static served files. |

| return | type | description |
| :--- | :--- | :--- |
| App | function | function conventionally denotes the [Express application](https://expressjs.com/en/4x/api.html#app). |

### model

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

##### var ModelEntity = model\(options, attributes, plugins\)

| parameter | type | description |
| :--- | :--- | :--- |
| options | string \| object | either model name for lazy loading or object for model configuration. |
| options.name | string | model name. |
| options.features | object | object contains special functionalities of the model. It is passed to [data access layer](#data-access). |
| options.query | array | array of [QueryExpression](#query) repressing the query to be executed by default. |
| attributes | object | object describes the model schema. it contains key-value pairs where the key is a model attribute/field name and the value is the data type of this attribute/field. Data types are native javascript data types String, Number and Date. Data type could be javascript array of single object annotation \[{}\] or just an object annotation {} containing other key-value pairs expressing nested model schema. |
| plugins | array | array of [mongoose plugins](https://www.npmjs.com/search?q=mongoose&page=1&ranking=optimal) to define additional functionalities to the model. |

| return | type | description |
| :--- | :--- | :--- |
| ModelEntity | function | model constructor function prototyped as [ModelEntity](#entity). |

### query

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
var query = [new QueryExpression({
    fieldName: 'username',
    comparisonOperator: ComparisonOperators.EQUAL,
    fieldValue: 'name'
}),new QueryExpression({    
    fieldName: 'password',
    comparisonOperator: ComparisonOperators.EQUAL,
    fieldValue: 'pass',
    logicalOperator: LogicalOperators.AND,
    contextualLevel: 0
})]
```

##### setComparisonOperators\(operators\)

##### setLogicalOperators\(operators\)

| parameter | type | description |
| :--- | :--- | :--- |
| operators | object | object contains key-value pairs where the key is a unique id for an operator and the value is a corresponding database engine operator. It is passed to [data access layer](#data-access). |

##### var expression = new QueryExpression\(options\)

| parameter | type | description |
| :--- | :--- | :--- |
| options | object | object describes a condition in a where clause of a query. |
| options.fieldName | string | attribute/field name of the model to be part of the condition. |
| options.comparisonOperator | string | a value represents comparison operation to be manipulated by database engine. |
| options.fieldValue | any | the value to be compared to the attribute/field of the model. |
| options.logicalOperator | string | a value represents logical operation to be manipulated by database to combine multiple conditions. |
| options.contextualLevel | number | starts with 0 represents the depth of the logical operation in the conditions tree. It is used to indicate brackets. |

| return | type | description |
| :--- | :--- | :--- |
| expression | object | object represents a condition expression combined with other expressions to represent a query. It is adapted by [data access layer](#data-access).. |

### entity

```js
var ModelEntity = backend.ModelEntity;
var entity = new ModelEntity({});
var model = entity.getObjectConstructor();
var schema = entity.getObjectAttributes();
var features = entity.getObjectFeatures();
var query = entity.getObjectQuery();
```

##### var entity = new ModelEntity\(features\)

| parameter | type | description |
| :--- | :--- | :--- |
| features | object | object contains special functionalities of the model. It is passed to [data access layer](#data-access). |

| return | type | description |
| :--- | :--- | :--- |
| entity | object | object contains all specifications and meta data of the model. |
| entity.getObjectConstructor | function | function returns the model constructor depending on the[ data access layer](#data-access). |
| entity.getObjectAttributes | function | function returns the model schema key-value pairs. |
| entity.getObjectFeatures | function | function returns the model features. |
| entity.getObjectQuery | function | function returns the model query an array of [QueryExpression](#query) to be executed by default. |

### behaviour \(API / functional code unit\)

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

##### var Behavior = behaviour\(option, constructor\);

| parameter | type | description |
| :--- | :--- | :--- |
| options | object | api configuration \(name, version, path, method, parameters, returns\) |
| constructor | function | logic function works by registering on methods to do functions regardless its orders, like \(database processor query, insert, delete or update\), data mapping to map returns of data to specific format or server error handling |

## data access

you should define your own data access layer like following

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

## Starter project

A sample project that you can learn from examples how to use Backend-JS.

#### [https://github.com/QuaNode/BeamJS-Start](https://github.com/QuaNode/BeamJS-Start)

#### 



