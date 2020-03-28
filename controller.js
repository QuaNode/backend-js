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

var MEMORY = 100;
var anonymousBusinessBehaviourCount = 0;
var timeout;

var businessController = function (key, memory) {

    if (!key) {

        anonymousBusinessBehaviourCount++;
        var interval = ((os.freemem() / 1024 / 1025) /
            (typeof memory === 'number' && memory ? memory : MEMORY)) - 1;
        if (anonymousBusinessBehaviourCount > interval) {

            key = 'AnonymousBusinessBehaviourQueue';
            if (timeout) clearTimeout(timeout);
            timeout = setTimeout(function () {

                anonymousBusinessBehaviourCount = 0;
            }, Math.abs(interval) * 1000);
        }
    }
    var businessControllerSharedInstance = typeof key === 'string' &&
        businessControllerSharedInstances[key];
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
                    }, 'Queue -> ' + (key || 'Anonymous'));
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
                        }, 'Queue -> ' + (key || 'Anonymous'));
                        // logCo n troller . log ( e, JSON.pa r se(window.localStorag e.g etI tem('currentUser')));                
                    }
                }
            }
        });
        if (typeof key === 'string')
            businessControllerSharedInstances[key] = businessControllerSharedInstance;
    }
    return businessControllerSharedInstance;
};

module.exports.businessController = businessController;
