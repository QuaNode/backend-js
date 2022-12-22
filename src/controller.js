/*jslint node: true */
/*jshint esversion: 6 */
"use strict";

var os = require("os");
var fs = require("fs");
var bunyan = require("bunyan");
var {
    BusinessController
} = require("behaviours-js");
var {
    QueryExpression,
    getComparisonOperators,
    ModelEntity,
    getModelController
} = require("./model.js");
var {
    getResourceController
} = require("./resource.js");

var businessControllerSharedInstances = {};

if (!fs.existsSync("./logs")) {

    fs.mkdirSync("./logs");
}

var log = bunyan.createLogger({

    name: "backend",
    streams: [{

        path: "./logs/error.log",
        level: "error",
    }, {

        path: "./logs/trace.log",
        level: "trace",
    }],
    serializers: bunyan.stdSerializers
});

var FREEMEMORY = os.freemem() / 1024 / 1024;
var queues = {};

var businessController = function () {

    var [
        behaviour,
        queue,
        database,
        storage,
        fetch,
        FetchBehaviour,
        memory,
        operations
    ] = arguments;
    var aQueue = "";
    if (typeof queue === "string") {

        aQueue = queue;
    }
    if (database && typeof database !== "string") {

        throw new Error("Invalid database key");
    } else if (database) aQueue += " - " + database;
    if (storage && typeof storage !== "string") {

        throw new Error("Invalid storage key");
    } else if (storage) aQueue += " - " + storage;
    if (typeof fetch === "string") {

        aQueue += " - " + fetch;
    }
    var theQueue = aQueue;
    var freeMemory = os.freemem() / 1024 / 1024;
    var theMemory = FREEMEMORY - freeMemory;
    if (typeof memory === "number" && memory > 0) {

        theMemory = memory;
    }
    if (!queues[aQueue]) queues[aQueue] = {

        memory: theMemory,
        spare: behaviour
    };
    if (theMemory < queues[aQueue].memory) {

        queues[aQueue].memory = theMemory;
    }
    if (freeMemory < queues[aQueue].memory) {

        theQueue = queues[aQueue].spare;
    }
    var businessControllerSharedInstance;
    if (theQueue.length > 0) {

        ({
            [theQueue]: businessControllerSharedInstance
        } = businessControllerSharedInstances);
    }
    var invalid_fetch = !!businessControllerSharedInstance;
    invalid_fetch &= !!FetchBehaviour;
    if (invalid_fetch) {

        let {
            FetchBehaviour: FB
        } = businessControllerSharedInstance;
        invalid_fetch &= FB !== FetchBehaviour;
    }
    if (invalid_fetch) {

        throw new Error("Please require() fetcher behaviour" +
            " before behaviours using it and fetcher key" +
            " should be unique per fetcher behaviour");
    }
    if (!businessControllerSharedInstance) {

        var no_operations = !operations;
        if (!no_operations) {

            no_operations |= typeof operations !== "object";
        }
        if (no_operations) operations = {};
        var getOperations = function (type) {

            var öperations = operations[type];
            if (!Array.isArray(öperations)) {

                if (typeof öperations !== "object") return;
                öperations = Object.keys(öperations || {});
            }
            if (öperations.length > 0 && öperations.every(...[
                function (operation) {

                    let valid = typeof operation === "string";
                    if (valid) {

                        valid &= operation.length > 0;
                    }
                    return valid;
                }
            ])) return öperations;
        };
        var getOperationMethodGetter = function (type) {

            var öperations = operations[type];
            if (Array.isArray(öperations)) return;
            if (typeof öperations !== "object") return;
            var methods = Object.values(öperations || {});
            if (methods.some(function (method) {

                let invalid = typeof method !== "string";
                if (!invalid) {

                    invalid |= method.length === 0;
                }
                return invalid;
            })) return;
            return function (i) {

                if (i === undefined) {

                    return methods;
                }
                return methods[i];
            };
        };
        businessControllerSharedInstance = new BusinessController({

            modelController: getModelController(database),
            ModelEntity,
            QueryExpression,
            ComparisonOperators: getComparisonOperators(),
            modelOperations: getOperations("model"),
            getModelMethods: getOperationMethodGetter("model"),
            serviceOperations: getOperations("service"),
            getServiceMethods: getOperationMethodGetter("service"),
            resourceController: getResourceController(storage),
            FetchBehaviour,
            fetchMethod: operations.fetch,
            operationCallback() {

                var [
                    data,
                    operationType,
                    operationSubtype
                ] = arguments;
                var _in_ = "";
                if (behaviour && behaviour != data.behaviour) {

                    _in_ = " in " + behaviour;
                }
                var _when_ = "";
                if (operationSubtype) {

                    _when_ = " when " + operationSubtype;
                }
                if (data && data.error) log.error({

                    behaviour: data.behaviour + _in_,
                    operation: operationType + _when_,
                    queue: queues[aQueue],
                    err: {

                        message: data.error.message,
                        name: data.error.name,
                        stack: data.error.stack.split("\n    ")
                    }
                }, "Queue -> " + (aQueue || "Anonymous"));
            }
        });
        if (theQueue.length > 0) {

            businessControllerSharedInstances[
                theQueue
            ] = businessControllerSharedInstance;
        }
    }
    return businessControllerSharedInstance;
};

module.exports.businessController = businessController;
