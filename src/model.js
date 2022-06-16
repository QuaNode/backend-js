/*jslint node: true */
/*jshint esversion: 6 */
'use strict';

var define = require('define-js');
var {
    QueryExpression,
    setComparisonOperators,
    setLogicalOperators,
    AggregateExpression,
    setComputationOperators,
    ModelEntity
} = require('behaviours-js');

module.exports.QueryExpression = QueryExpression;
module.exports.setComparisonOperators = setComparisonOperators;
module.exports.getComparisonOperators = function () {

    return require('behaviours-js').ComparisonOperators;
};
module.exports.setLogicalOperators = setLogicalOperators;
module.exports.AggregateExpression = AggregateExpression;
module.exports.setComputationOperators = setComputationOperators;
module.exports.ModelEntity = ModelEntity;

var ModelControllers = {};
var modelControllers = {};

module.exports.setModelController = function (mc, key) {

    if (key && typeof key !== 'string') {

        throw new Error('Invalid model controller key');
    }
    if (typeof mc !== 'object') {

        throw new Error('Invalid model controller');
    }
    if (typeof mc.removeObjects !== 'function') {

        throw new Error('Missing removeObjects method in model controller');
    }
    if (typeof mc.addObjects !== 'function') {

        throw new Error('Missing addObjects method in model controller');
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
    modelControllers[key || 'main'] = mc;
    ModelControllers[key || 'main'] = mc.constructor;
};

module.exports.getModelController = function (key) {

    return modelControllers[key || 'main'];
};

module.exports.model = function () {

    return function (options, attributes, plugins) {

        if (typeof options === 'string' && !attributes && !plugins) return function (modelName) {

            var modelEntity = ModelEntity.getModelEntity(options);
            if (!modelEntity)
                throw new Error('Use require() instead of model() for ' +
                    options + ' in ' + modelName);
            return modelEntity;
        };
        if (typeof options !== 'object') {

            throw new Error('Invalid definition object');
        }
        if (typeof options.name !== 'string' || options.name.length === 0) {

            throw new Error('Invalid model name');
        }
        if (options.database && (typeof options.database !== 'string' ||
            options.database.length === 0)) {

            throw new Error('Invalid database key');
        }
        if (!ModelControllers[options.database || 'main'] ||
            !modelControllers[options.database || 'main']) {

            throw new Error('Set model controller before defining a model');
        }
        // if (typeof options.version !== 'string') {

        //   throw new Error('Invalid model version');
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

            Object.keys(attributes).forEach(function (key) {

                if (!attributes[key])
                    throw new Error('Undefined attribute! try to use model() instead of require()' +
                        ' for ' + key + ' in ' + options.name + ' or check attribute datatype');
            });
        }
        var EntityConstructor =
            ModelControllers[options.database || 'main'].defineEntity(options.name, attributes,
                plugins, options.constraints);
        var Entity = define(function (init) {

            return function (features, query, aggregate) {

                if (Array.isArray(features)) {

                    aggregate = query;
                    query = features;
                    features = undefined;
                }
                init.apply(this, [{

                    constructor: EntityConstructor,
                    attributes: attributes,
                    features:
                        Object.assign((typeof features === 'object' && features) || {},
                            options.features),
                    query: options.query.concat((Array.isArray(query) && query) || []),
                    aggregate:
                        options.aggregate.concat((Array.isArray(aggregate) && aggregate) || [])
                }]).self();
            };
        }).extend(ModelEntity).defaults({

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
};
