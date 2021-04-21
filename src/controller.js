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

var businessController = function (queue, database, storage, fetch, FetchBehaviour, memory) {

    var aQueue = typeof queue === 'string' ? queue : '';
    if (database && typeof database !== 'string') throw new Error('Invalid database key');
    else if (database) aQueue += database;
    if (storage && typeof storage !== 'string') throw new Error('Invalid storage key');
    else if (storage) aQueue += storage;
    if (typeof fetch === 'string') aQueue += fetch;
    var theQueue = aQueue;
    var freeMemory = os.freemem() / 1024 / 1024;
    var theMemory = typeof memory === 'number' && memory > 0 ? memory : FREEMEMORY - freeMemory;
    if (!queues[aQueue]) queues[aQueue] = {

        count: 0,
        spare: {

            count: 0,
            key: aQueue + new Date().getTime()
        }
    };
    var count = (freeMemory / theMemory) - 1;
    if (queues[aQueue].count > count && count > 0) {

        if (queues[aQueue].spare.count > count) {

            queues[aQueue].spare.count = 0;
            queues[aQueue].spare.key = aQueue + new Date().getTime();
        }
        theQueue = queues[aQueue].spare.key;
        queues[aQueue].spare.count++;
        if (queues[aQueue].timeout) clearTimeout(queues[aQueue].timeout);
        queues[aQueue].timeout = setTimeout(function () {

            queues[aQueue].count = 0;
        }, Math.abs(count) * 1000);
    } else queues[aQueue].count++;
    var businessControllerSharedInstance = theQueue.length > 0 &&
        businessControllerSharedInstances[theQueue];
    if (businessControllerSharedInstance && FetchBehaviour &&
        businessControllerSharedInstance.FetchBehaviour !== FetchBehaviour)
        throw new Error('Please require() fetcher behaviour before behaviours using it and fetcher' +
            ' key should be unique per fetcher behaviour');
    if (!businessControllerSharedInstance) {

        businessControllerSharedInstance = new BusinessController({

            modelController: getModelController(database),
            ModelEntity: ModelEntity,
            QueryExpression: QueryExpression,
            ComparisonOperators: getComparisonOperators(),
            resourceController: getResourceController(storage),
            FetchBehaviour: FetchBehaviour,
            operationCallback: function (data, operationType, operationSubtype) {

                if (data && data.error) {

                    log.trace({

                        behaviour: data.behaviour,
                        err: {

                            message: data.error.message,
                            name: data.error.name,
                            stack: data.error.stack.split('\n    ')
                        }
                    }, 'Queue -> ' + (theQueue || 'Anonymous'));
                    try {

                        throw new Error('When ' + operationType + ' @ ' + operationSubtype);
                    } catch (e) {

                        log.error({

                            behaviour: data.behaviour,
                            err: {

                                message: e.message,
                                name: e.name,
                                stack: e.stack.split('\n    ')
                            }
                        }, 'Queue -> ' + (theQueue || 'Anonymous'));
                    }
                }
            }
        });
        if (theQueue.length > 0)
            businessControllerSharedInstances[theQueue] = businessControllerSharedInstance;
    }
    return businessControllerSharedInstance;
};

module.exports.businessController = businessController;
