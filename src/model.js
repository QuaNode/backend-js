/*jslint node: true */
/*jshint esversion: 6 */
"use strict";

var define = require("define-js");
var {
    QueryExpression,
    setComparisonOperators,
    setLogicalOperators,
    AggregateExpression,
    setComputationOperators,
    ModelEntity
} = require("behaviours-js");

module.exports = {

    QueryExpression,
    setComparisonOperators,
    getComparisonOperators() {

        var {
            ComparisonOperators
        } = require("behaviours-js");
        return ComparisonOperators;
    },
    setLogicalOperators,
    AggregateExpression,
    setComputationOperators,
    ModelEntity
};

var ModelControllers = {};
var modelControllers = {};

module.exports.setModelController = function () {

    var [mc, key] = arguments;
    if (key && typeof key !== "string") {

        throw new Error("Invalid model" +
            " controller key");
    }
    if (typeof mc !== "object") {

        throw new Error("Invalid model" +
            " controller");
    }
    if (typeof mc.removeObjects !== "function") {

        throw new Error("Missing removeObjects" +
            " method in model controller");
    }
    if (typeof mc.addObjects !== "function") {

        throw new Error("Missing addObjects" +
            " method in model controller");
    }
    if (typeof mc.getObjects !== "function") {

        throw new Error("Missing getObjects" +
            " method in model controller");
    }
    if (typeof mc.constructor !== "function") {

        throw new Error("Missing constructor" +
            " in model controller");
    }
    let {
        defineEntity
    } = mc.constructor;
    if (typeof defineEntity !== "function") {

        throw new Error("Missing defineEntity" +
            " method in model controller" +
            " constructor");
    }
    modelControllers[key || "main"] = mc;
    ModelControllers[key || "main"] = mc.constructor;
};

module.exports.getModelController = function (key) {

    return modelControllers[key || "main"];
};

module.exports.model = function () {

    return function () {

        var [
            options,
            attributes,
            plugins
        ] = arguments;
        var defined = typeof options === "string";
        defined &= !attributes;
        defined &= !plugins;
        if (defined) return function () {

            var [modelName] = arguments;
            var {
                getModelEntity
            } = ModelEntity;
            var modelEntity = getModelEntity(...[
                options
            ]);
            if (!modelEntity) {

                throw new Error("Use require()" +
                    " instead of model() for " +
                    options + " in " + modelName);
            }
            return modelEntity;
        };
        if (typeof options !== "object") {

            throw new Error("Invalid definition" +
                " object");
        }
        let {
            name,
            database
        } = options;
        var no_name = typeof name !== "string";
        if (!no_name) {

            no_name |= name.length === 0;
        }
        if (no_name) {

            throw new Error("Invalid model name");
        }
        var invalid = !!database;
        if (invalid) {

            invalid = typeof database !== "string";
            if (!invalid) {

                invalid |= database.length === 0;
            }
        }
        if (invalid) {

            throw new Error("Invalid database key");
        }
        var no_controller = !ModelControllers[
            database || "main"
        ];
        no_controller |= !modelControllers[
            database || "main"
        ];
        if (no_controller) {

            throw new Error("Set model controller" +
                " before defining a model");
        }
        // if (typeof options.version !== "string") {

        //   throw new Error("Invalid model version");
        // }
        if (typeof options.features !== "object") {

            options.features = {};
        }
        if (!Array.isArray(options.query)) {

            options.query = [];
        }
        if (!Array.isArray(options.aggregate)) {

            options.aggregate = [];
        }
        if (typeof attributes !== "object") {

            throw new Error("Invalid attributes");
        } else Object.keys(attributes).forEach(...[
            function (key) {

                if (!attributes[key]) {

                    throw new Error("Undefined" +
                        " attribute! try to use" +
                        " model() instead of " +
                        "require() for " + key +
                        " in " + name + " or " +
                        "check attribute datatype");
                }
            }
        ]);
        var EntityConstructor = ModelControllers[
            database || "main"
        ].defineEntity(...[
            name,
            attributes,
            plugins,
            options.constraints
        ]);
        var Entity = define(function (init) {

            return function () {

                let [
                    features,
                    query,
                    aggregate
                ] = arguments;
                if (Array.isArray(features)) {

                    aggregate = query;
                    query = features;
                    features = undefined;
                }
                if (typeof features !== "object") {

                    features = {};
                }
                if (!Array.isArray(query)) {

                    if (query) {

                        query = [query];
                    } else query = [];
                }
                if (!Array.isArray(aggregate)) {

                    if (aggregate) {

                        aggregate = [aggregate];
                    } else aggregate = [];
                }
                init.apply(this, [{

                    constructor: EntityConstructor,
                    attributes,
                    features: Object.assign(...[
                        features,
                        options.features
                    ]),
                    query: [
                        ...options.query,
                        ...query
                    ],
                    aggregate: [
                        ...options.aggregate,
                        ...aggregate
                    ]
                }]).self();
            };
        }).extend(ModelEntity).defaults({

            constructor: EntityConstructor,
            attributes,
            features: options.features,
            query: options.query,
            aggregate: options.aggregate
        });
        ModelEntity.registerModelEntity({

            entity: Entity,
            entityName: name
        });
        return Entity;
    };
};
