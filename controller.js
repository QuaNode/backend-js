/*jslint node: true */
'use strict';

var BusinessController = require('./business/BusinessController.js').BusinessController;
var QueryExpression = require('./model.js').QueryExpression;
var ModelEntity = require('./model.js').ModelEntity;

var businessControllerSharedInstances = {};

var businessController = function(key) {

    var businessControllerSharedInstance = typeof key === 'string' && businessControllerSharedInstances[key];
    if (!businessControllerSharedInstance) {

        businessControllerSharedInstance = new BusinessController({

            modelController: require('./model.js').modelController,
            ModelEntity: ModelEntity,
            QueryExpression: QueryExpression,
            ComparisonOperators: require('./model/QueryExpression.js').ComparisonOperators,
            //cacheController : cacheController,
            operationCallback: function(data, operationType, operationSubtype) {

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
