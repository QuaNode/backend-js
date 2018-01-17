/*jslint node: true */
'use strict';

var define = require('define-js');
var ModelEntity = require('./model/ModelEntity.js').ModelEntity;

module.exports.setComparisonOperators = require('./model/QueryExpression.js').setComparisonOperators;
module.exports.setLogicalOperators = require('./model/QueryExpression.js').setLogicalOperators;
module.exports.QueryExpression = require('./model/QueryExpression.js').QueryExpression;

var ModelController = null;
var modelController = null;
var model = module.exports;
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
    model.ModelController = ModelController;
    model.modelController = modelController;
};
module.exports.model = function(options, attributes, plugins) {

    if (typeof options === 'string' && !attributes && !plugins) return function(modelName) {

        var modelEntity = ModelEntity.getModelEntity(options);
        if (!modelEntity) throw new Error('Use require() instead of model() for ' + options + ' in ' + modelName);
        return modelEntity;
    };
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
    if (!Array.isArray(options.query)) {

        options.query = [];
    }
    if (typeof attributes !== 'object') {

        throw new Error('Invalid attributes');
    } else {

        Object.keys(attributes).forEach(function(key) {

            if (!attributes[key]) throw new Error('undefined attribute ! try to use model() instead of require() for ' + key + ' in ' + options.name + ' or check attribute datatype');
        });
    }
    var EntityConstructor = ModelController.defineEntity(options.name, attributes, plugins, options.constraints);
    var Entity = define(function(init) {

        return function(features, query) {

            if (!Array.isArray(query)) {

                query = [];
            }
            init.apply(this, [{

                constructor: EntityConstructor,
                attributes: attributes,
                features: Object.assign(features || {}, options.features),
                query: options.query.concat(query)
            }]).self();
        };
    }).extend(ModelEntity).parameters({

        constructor: EntityConstructor,
        attributes: attributes,
        features: options.features,
        query: options.query
    });
    ModelEntity.registerModelEntity({

        entity: Entity,
        entityName: options.name
    });
    return Entity;
};
