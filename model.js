/*jslint node: true */
'use strict';

var merge = require('merge');
var define = require('define-js');

module.exports.setComparisonOperators = require('./model/QueryExpression.js').setComparisonOperators;
module.exports.setLogicalOperators = require('./model/QueryExpression.js').setLogicalOperators;
module.exports.QueryExpression = require('./model/QueryExpression.js').QueryExpression;
var ModelEntity = require('./model/ModelEntity.js').ModelEntity;
module.exports.ModelEntity = ModelEntity;

var ModelController = null;
var modelController = null;

module.exports.setModelController = function(mc) {

  if (typeof mc !== 'object') {

    throw new Error('Invalid model controller');
  }
  if (typeof mc.removeObjects !== 'function') {

    throw new Error('missing removeObjects method in model controller');
  }
  if (typeof mc.newObjects !== 'function') {

    throw new Error('missing newObjects method in model controller');
  }
  if (typeof mc.getObjects !== 'function') {

    throw new Error('missing getObjects method in model controller');
  }
  if (typeof mc.constructor !== 'function') {

    throw new Error('missing constructor in model controller');
  }
  if (typeof mc.constructor.defineEntity !== 'function') {

    throw new Error('missing defineEntity method in model controller constructor');
  }
  modelController = mc;
  ModelController = modelController.constructor;
  module.exports.ModelController = ModelController;
  module.exports.modelController = modelController;
};

module.exports.model = function(definitionObj, attributes, plugins) {

  if (!ModelController || !modelController) {

    throw new Error('Set model controller before defining a model');
  }
  if (typeof definitionObj !== 'object') {

    throw new Error('Invalid definition object');
  }
  if (typeof definitionObj.name !== 'string' || definitionObj.name.length === 0) {

    throw new Error('Invalid model name');
  }
  // if (typeof definitionObj.version !== 'string') {

  //   throw new Error('Invalid behaviour version');
  // }
  if (typeof definitionObj.features !== 'object') {

    definitionObj.features = {};
  }
  if (!Array.isArray(definitionObj.queryExpressions)) {

    definitionObj.queryExpressions = [];
  }
  if (typeof attributes !== 'object') {

    throw new Error('Invalid attributes');
  }
  var EntityConstructor = ModelController.defineEntity(definitionObj.name, attributes, plugins);
  var Entity = define(function(init) {

    return function(features) {

      init.apply(this, [{

        constructor: EntityConstructor,
        attributes: attributes,
        features: merge(features, definitionObj.features),
        queryExpressions: definitionObj.queryExpressions
      }]).self();
    };
  }).extend(ModelEntity).parameters({

    constructor: EntityConstructor,
    attributes: attributes,
    features: definitionObj.features,
    queryExpressions: definitionObj.queryExpressions
  });
  ModelEntity.registerModelEntity({

    entity: Entity,
    entityName: definitionObj.name
  });
  return Entity;
};

// Attributes.interactions[0].type = Attributes.interactions[0].type.type;
// Attributes.settings.payment_methods[0].type = Attributes.settings.payment_methods[0].type.type;
