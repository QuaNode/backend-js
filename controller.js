/*jslint node: true */
/*jshint esversion: 6 */
'use strict';

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

var businessController = function (key) {

    var businessControllerSharedInstance = typeof key === 'string' && businessControllerSharedInstances[key];
    if (!businessControllerSharedInstance) {

        businessControllerSharedInstance = new BusinessController({

            modelController: getModelController(),
            ModelEntity: ModelEntity,
            QueryExpression: QueryExpression,
            ComparisonOperators: getComparisonOperators(),
            //cacheController : cacheController,
            operationCallback: function (data, operationType, operationSubtype) {

                if (data && data.error) {

                    log.trace(data.error, 'Queue: ' + (key || 'General'));
                    try {

                        throw new Error('When: ' + operationType + ' at: ' + operationSubtype);
                    } catch (e) {

                        log.error(e, 'Queue: ' + (key || 'General'));
                        // logController.log(e, JSON.parse(window.localStorage.getItem('currentUser')));
                    }
                }
            }
        });
        if (typeof key === 'string') businessControllerSharedInstances[key] = businessControllerSharedInstance;
    }
    return businessControllerSharedInstance;
};

module.exports.businessController = businessController;
