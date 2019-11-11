/*jslint node: true */
/*jshint esversion: 6 */
'use strict';

let BusinessController = require('./business/BusinessController.js').BusinessController;
let QueryExpression = require('./model.js').QueryExpression;
let getComparisonOperators = require('./model.js').getComparisonOperators;
let ModelEntity = require('./model.js').ModelEntity;
let getModelController = require('./model.js').getModelController;

var businessControllerSharedInstances = {};

var businessController = function (key) {

    var businessControllerSharedInstance = typeof key === 'string' && businessControllerSharedInstances[key];
    if (!businessControllerSharedInstance) {

        businessControllerSharedInstance = new BusinessController({

            modelController: getModelController(),
            ModelEntity: ModelEntity,
            QueryExpression: QueryExpression,
            ComparisonOperators: getComparisonOperators(),
            //cacheController : cacheController,
            operationCallback: function ( /*data, operationType , operationSubtype*/ ) {

                /*if (data && data.error) {

                 try {

                 throw new Error(operationType + '   ' + operationSubtype + '   ' + JSON.stringify(data, null, 3));
                 } catch (e) {

                 logController.log(e, JSON.parse(window.localStorage.getItem('currentUser')));
                 }
                 }*/
            }
        });
        if (typeof key === 'string') businessControllerSharedInstances[key] = businessControllerSharedInstance;
    }
    return businessControllerSharedInstance;
};

module.exports.businessController = businessController;
