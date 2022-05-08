/*jslint node: true */
/*jshint esversion: 6 */
'use strict';

var os = require('os');
var fs = require('fs');
var bunyan = require('bunyan');
var BusinessController = require('behaviours-js').BusinessController;
var {
    QueryExpression,
    getComparisonOperators,
    ModelEntity,
    getModelController
} = require('./model.js');
var getResourceController = require('./resource.js').getResourceController;

var businessControllerSharedInstances = {};

if (!fs.existsSync('./logs')) fs.mkdirSync('./logs');

var log = bunyan.createLogger({

    name: 'backend',
    streams: [{

        path: './logs/error.log',
        level: 'error',
    }, {

        path: './logs/trace.log',
        level: 'trace',
    }],
    serializers: bunyan.stdSerializers
});

var FREEMEMORY = os.freemem() / 1024 / 1024;
var queues = {};

var businessController =
    function (behaviour, queue, database, storage, fetch, FetchBehaviour, memory, operations) {

        var aQueue = typeof queue === 'string' ? queue : '';
        if (database && typeof database !== 'string') throw new Error('Invalid database key');
        else if (database) aQueue += ' - ' + database;
        if (storage && typeof storage !== 'string') throw new Error('Invalid storage key');
        else if (storage) aQueue += ' - ' + storage;
        if (typeof fetch === 'string') aQueue += ' - ' + fetch;
        var theQueue = aQueue;
        var freeMemory = os.freemem() / 1024 / 1024;
        var theMemory = typeof memory === 'number' && memory > 0 ? memory : FREEMEMORY - freeMemory;
        if (!queues[aQueue]) queues[aQueue] = {

            memory: theMemory,
            spare: behaviour
        };
        if (theMemory < queues[aQueue].memory) queues[aQueue].memory = theMemory;
        if (freeMemory < queues[aQueue].memory) theQueue = queues[aQueue].spare;
        var businessControllerSharedInstance = theQueue.length > 0 &&
            businessControllerSharedInstances[theQueue];
        if (businessControllerSharedInstance && FetchBehaviour &&
            businessControllerSharedInstance.FetchBehaviour !== FetchBehaviour)
            throw new Error('Please require() fetcher behaviour before behaviours using it and fetcher' +
                ' key should be unique per fetcher behaviour');
        if (!businessControllerSharedInstance) {

            if (!operations || typeof operations !== 'object') operations = {};
            var getOperations = function (type) {

                var öperations = operations[type];
                if (!Array.isArray(öperations)) {

                    if (typeof öperations !== 'object') return;
                    öperations = Object.keys(öperations || {});
                }
                if (öperations.length > 0 && öperations.every(function (operation) {

                    return typeof operation === 'string' && operation.length > 0;
                })) return öperations;
            };
            var getOperationMethodGetter = function (type) {

                var öperations = operations[type];
                if (Array.isArray(öperations)) return;
                if (typeof öperations !== 'object') return;
                var methods = Object.values(öperations || {});
                if (methods.some(function (method) {

                    return typeof method !== 'string' || method.length === 0;
                })) return;
                return function (i) {

                    return i === undefined ? methods : methods[i];
                };
            };
            businessControllerSharedInstance = new BusinessController({

                modelController: getModelController(database),
                ModelEntity: ModelEntity,
                QueryExpression: QueryExpression,
                ComparisonOperators: getComparisonOperators(),
                modelOperations: getOperations('model'),
                getModelMethods: getOperationMethodGetter('model'),
                serviceOperations: getOperations('service'),
                getServiceMethods: getOperationMethodGetter('service'),
                resourceController: getResourceController(storage),
                FetchBehaviour: FetchBehaviour,
                fetchMethod: operations.fetch,
                operationCallback: function (data, operationType, operationSubtype) {

                    if (data && data.error) log.error({

                        behaviour: data.behaviour + (behaviour ? ' in ' + behaviour : ''),
                        operation: operationType + (operationSubtype ? ' when ' + operationSubtype : ''),
                        queue: queues[aQueue],
                        err: {

                            message: data.error.message,
                            name: data.error.name,
                            stack: data.error.stack.split('\n    ')
                        }
                    }, 'Queue -> ' + (aQueue || 'Anonymous'));
                }
            });
            if (theQueue.length > 0)
                businessControllerSharedInstances[theQueue] = businessControllerSharedInstance;
        }
        return businessControllerSharedInstance;
    };

module.exports.businessController = businessController;
