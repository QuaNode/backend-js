/*jslint node: true */
/*jshint esversion: 6 */
'use strict';

let define = require('define-js');

module.exports.QueryExpression = require('./model/QueryExpression.js').QueryExpression;
module.exports.setComparisonOperators = require('./model/QueryExpression.js').setComparisonOperators;
module.exports.getComparisonOperators = function() {

    return require('./model/QueryExpression.js').ComparisonOperators;
};
module.exports.setLogicalOperators = require('./model/QueryExpression.js').setLogicalOperators;
module.exports.AggregateExpression = require('./model/AggregateExpression.js').AggregateExpression;
module.exports.setComputationOperators = require('./model/AggregateExpression.js').setComputationOperators;

let ModelEntity = module.exports.ModelEntity = require('./model/ModelEntity.js').ModelEntity;
var ModelController = null;
var modelController = null;

module.exports.setModelController = function(mc) {

    if (typeof mc !== 'object') {

        throw new Error('Invalid model controller');
    }
    if (typeof mc.removeObjects !== 'function') {

        throw new Error('Missing removeObjects method in model controller');
    }
    if (typeof mc.newObjects !== 'function') {

        throw new Error('Missing newObjects method in model controller');
    }
    if (typeof mc.getObjects !== 'function') {

        throw new Error('Missing getObjects method in model controller');
    }
    if (typeof mc.constructor !== 'function') {

        throw new Error('Missing constructor in model controller');
    }
    if (typeof mc.constructor.defineEntity !== 'function') {

        throw new Error('Missing defineEntity method in model controller constructor');
    }
    modelController = mc;
    ModelController = modelController.constructor;
};

module.exports.getModelController = function() {

    return modelController;
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
    if (!Array.isArray(options.aggregate)) {

        options.aggregate = [];
    }
    if (typeof attributes !== 'object') {

        throw new Error('Invalid attributes');
    } else {

        Object.keys(attributes).forEach(function(key) {

            if (!attributes[key]) throw new Error('Undefined attribute! try to use model() instead of require() for ' +
                key + ' in ' + options.name + ' or check attribute datatype');
        });
    }
    var EntityConstructor = ModelController.defineEntity(options.name, attributes, plugins, options.constraints);
    var Entity = define(function(init) {

        return function(features, query, aggregate) {

            init.apply(this, [{

                constructor: EntityConstructor,
                attributes: attributes,
                features: Object.assign((typeof features === 'object' && features) || {}, options.features),
                query: options.query.concat((Array.isArray(query) && query) || []),
                aggregate: options.aggregate.concat((Array.isArray(aggregate) && aggregate) || [])
            }]).self();
        };
    }).extend(ModelEntity).parameters({

        constructor: EntityConstructor,
        attributes: attributes,
        features: options.features,
        query: options.query,
        aggregate: options.aggregate
    });
    ModelEntity.registerModelEntity({

        entity: Entity,
        entityName: options.name
    });
    return Entity;
};
