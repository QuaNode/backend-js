/*jslint node: true */
/*jshint esversion: 6 */
"use strict";

var os = require("os");
var fs = require("fs");
var debug = require("debug");
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

var inform = debug("backend:controller:info");
inform.log = console.log.bind(console);

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

var getFreeMemory = () => os.freemem() / 1024 / 1024;
var FREEMEMORY = getFreeMemory();
var MEMORY = { _0: 0, _1: 5, _2: 55 };
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
        operations,
        requesting
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
    var freeMemory = getFreeMemory();
    var theMemory = FREEMEMORY - freeMemory;
    if (theMemory != MEMORY._0) FREEMEMORY = freeMemory;
    if (theMemory < MEMORY._1) theMemory = MEMORY._1;
    if (theMemory > MEMORY._2) theMemory = MEMORY._2;
    if (typeof memory === "number" && memory > 0) {

        theMemory = memory;
    }
    if (!queues[aQueue]) queues[aQueue] = {

        memory: theMemory,
        spare: behaviour || new Date().getTime()
    }; else queues[aQueue].memory = theMemory;
    if (requesting && freeMemory < queues[aQueue].memory) {

        theQueue = queues[aQueue].spare;
        inform("Behaviour " + (behaviour ? "'" + behaviour +
            "' " : "") + "to run on spare queue due to" +
            " low free memory: " + freeMemory);
    }
    var businessControllerSharedInstance;
    if (theQueue && theQueue.length > 0) {

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

            identifier: theQueue,
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
                var _url_;
                if (typeof requesting === "function") {

                    var req = requesting();
                    if (typeof req === "object") {

                        ({ url: _url_ } = req);
                    }
                }
                if (data && data.error) log.error({

                    behaviour: data.behaviour + _in_,
                    operation: operationType + _when_,
                    queue: queues[aQueue],
                    request: _url_,
                    err: {

                        message: data.error.message,
                        name: data.error.name,
                        stack: function () {

                            var { stack } = data.error;
                            if (typeof stack === "string") {

                                return stack.split("\n    ");
                            }
                            return stack;
                        }()
                    }
                }, "Queue -> " + (theQueue || "Anonymous"));
            }
        });
        if (theQueue && theQueue.length > 0) {

            businessControllerSharedInstances[
                theQueue
            ] = businessControllerSharedInstance;
        }
    }
    return businessControllerSharedInstance;
};

module.exports.businessController = businessController;
