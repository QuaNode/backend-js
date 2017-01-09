/*jslint node: true */
'use strict';

var merge = require('merge');
var define = require('define-js');

module.exports.setComparisonOperators = require('./model/QueryExpression.js').setComparisonOperators;
module.exports.setLogicalOperators = require('./model/QueryExpression.js').setLogicalOperators;
module.exports.QueryExpression = require('./model/QueryExpression.js').QueryExpression;
var ModelEntity = require('./model/ModelEntity.js').ModelEntity;

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

module.exports.model = function(options, attributes, plugins) {

  if (!ModelController || !modelController) {

    throw new Error('Set model controller before defining a model');
  }
  if (typeof options !== 'object') {

    throw new Error('Invalid definition object');
  }
  if (typeof options.name !== 'string' || options.name.length === 0) {

    throw new Error('Invalid model name');
  }
  // if (typeof options.version !== 'string') {

  //   throw new Error('Invalid behaviour version');
  // }
  if (typeof options.features !== 'object') {

    options.features = {};
  }
  if (!Array.isArray(options.queryExpressions)) {

    options.queryExpressions = [];
  }
  if (typeof attributes !== 'object') {

    throw new Error('Invalid attributes');
  }
  var EntityConstructor = ModelController.defineEntity(options.name, attributes, plugins);
  Object.keys(attributes).forEach(function(key) {

    if (key === 'type' && typeof attributes[key] === 'object') {

      var object = typeof attributes[key] === 'object' ? attributes[key] : Array.isArray(attributes[key]) ? attributes[key][0] : null;
      if (object && Object.keys[object].length == 1 && Object.keys[object][0] === 'type') {

        object.type = object.type.type;
      }
    }
  });
  var Entity = define(function(init) {

    return function(features) {

      init.apply(this, [{

        constructor: EntityConstructor,
        attributes: attributes,
        features: merge(features, options.features),
        queryExpressions: options.queryExpressions
      }]).self();
    };
  }).extend(ModelEntity).parameters({

    constructor: EntityConstructor,
    attributes: attributes,
    features: options.features,
    queryExpressions: options.queryExpressions
  });
  ModelEntity.registerModelEntity({

    entity: Entity,
    entityName: options.name
  });
  return Entity;
};
