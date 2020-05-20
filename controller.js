/*jslint node: true */
/*jshint esversion: 6 */
'use strict';

let os = require('os');
let fs = require('fs');
let bunyan = require('bunyan');
let BusinessController = require('./business/BusinessController.js').BusinessController;
let QueryExpression = require('./model.js').QueryExpression;
let getComparisonOperators = require('./model.js').getComparisonOperators;
let ModelEntity = require('./model.js').ModelEntity;
let getModelController = require('./model.js').getModelController;

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

var businessController = function (queue, memory) {

    var theQueue = queue;
    var freeMemory = os.freemem() / 1024 / 1024;
    var theMemory = typeof memory === 'number' && memory > 0 ? memory : FREEMEMORY - freeMemory;
    if (!queues[queue || '']) queues[queue || ''] = {

        count: 0,
        spare: {

            count: 0,
            key: (queue || '') + new Date().getTime()
        }
    };
    var count = (freeMemory / theMemory) - 1;
    if (queues[queue || ''].count > count && count > 0) {

        if (queues[queue || ''].spare.count > count) {

            queues[queue || ''].spare.count = 0;
            queues[queue || ''].spare.key = (queue || '') + new Date().getTime();
        }
        theQueue = queues[queue || ''].spare.key;
        queues[queue || ''].spare.count++;
        if (queues[queue || ''].timeout) clearTimeout(queues[queue || ''].timeout);
        queues[queue || ''].timeout = setTimeout(function () {

            queues[queue || ''].count = 0;
        }, Math.abs(count) * 1000);
    } else queues[queue || ''].count++;
    var businessControllerSharedInstance = typeof theQueue === 'string' &&
        businessControllerSharedInstances[theQueue];
    if (!businessControllerSharedInstance) {

        businessControllerSharedInstance = new BusinessController({

            modelController: getModelController(),
            ModelEntity: ModelEntity,
            QueryExpression: QueryExpression,
            ComparisonOperators: getComparisonOperators(),
            //cacheController : cacheController,
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
                        // logController.log(e, JSON.parse(window.localStorage.getItem('currentUser')));                
                    }
                }
            }
        });
        if (typeof theQueue === 'string')
            businessControllerSharedInstances[theQueue] = businessControllerSharedInstance;
    }
    return businessControllerSharedInstance;
};

module.exports.businessController = businessController;
