/*jslint node: true */
/*jshint esversion: 6 */
'use strict';

let BehaviourTypes = require('./BusinessBehaviour.js').BusinessBehaviourType;
let BusinessOperation = require('./BusinessBehaviourCycle.js').BusinessOperation;

var OperationType = {

    FETCH: 'fetch',
    REQUEST: 'request',
    MANIPULATE: 'manipulate',
    MAPFROM: 'mapfrom',
    MAPTO: 'mapto',
    MAPBETWEEN: 'mapbetween'
};

var getFetchCallback = function (currentBehaviour, operationCallback, callback) {

    return function (resource, error) {

        if (resource) currentBehaviour.state.serviceObjects = [resource.data || resource.id || resource.path];
        if (error) currentBehaviour.state.error = error;
        if (typeof operationCallback === 'function') operationCallback({

            behaviour: currentBehaviour.name,
            inputObjects: currentBehaviour.inputObjects,
            resource: resource,
            error: error
        }, OperationType.FETCH);
        callback();
    };
};

var getFetchCancelCallback = function (currentBehaviour) {

    return function (cancel) {

        if (cancel) currentBehaviour.cancel = cancel;
    };
};

var getRequestCallback = function (currentBehaviour, serviceOperation, operationCallback, callback) {

    return function (serviceObjects, error) {

        if (serviceObjects) {

            if (!currentBehaviour.state.serviceObjects) currentBehaviour.state.serviceObjects = [];
            if (Array.isArray(serviceObjects))
                Array.prototype.push.apply(currentBehaviour.state.serviceObjects, serviceObjects);
            else currentBehaviour.state.serviceObjects.push(serviceObjects);
        }
        if (error) currentBehaviour.state.error = error;
        if (typeof operationCallback === 'function') operationCallback({

            behaviour: currentBehaviour.name,
            inputObjects: currentBehaviour.inputObjects,
            serviceObjects: serviceObjects,
            error: error
        }, OperationType.REQUEST, serviceOperation);
        callback();
    };
};

var getManipulateCallback = function (currentBehaviour, modelOperation, operationCallback, callback) {

    return function (modelObjects, error) {

        if (modelObjects) {

            if (!currentBehaviour.state.modelObjects) currentBehaviour.state.modelObjects = [];
            if (Array.isArray(modelObjects))
                Array.prototype.push.apply(currentBehaviour.state.modelObjects, modelObjects);
            else currentBehaviour.state.modelObjects.push(modelObjects);
        }
        if (error) currentBehaviour.state.error = error;
        if (typeof operationCallback === 'function') operationCallback({

            behaviour: currentBehaviour.name,
            inputObjects: currentBehaviour.inputObjects,
            modelObjects: modelObjects,
            error: error
        }, OperationType.MANIPULATE, modelOperation);
        callback();
    };
};

var getMapFromCallback = function (currentBehaviour, operationCallback, callback) {

    return function () {

        if (typeof operationCallback === 'function') operationCallback({

            behaviour: currentBehaviour.name,
            inputObjects: currentBehaviour.inputObjects
        }, OperationType.MAPFROM, BusinessOperation.SERVICEOBJECTMAPPING);
        callback();
    };
};

var getMappingCallback = function (currentBehaviour, operation, operationCallback, callback) {


    return function (businessObjects) {

        if (typeof operationCallback === 'function') operationCallback({

            behaviour: currentBehaviour.name,
            inputObjects: currentBehaviour.inputObjects,
            businessObjects: businessObjects
        }, operation, BusinessOperation.MODELOBJECTMAPPING);
        callback(businessObjects);
    };
};

var BusinessControllerExt = function (options) {

    var self = this;
    var modelOperationDelegate = options.modelOperationDelegate;
    var serviceOperationDelegate = options.serviceOperationDelegate;
    var businessOperationDelegate = options.businessOperationDelegate;
    var FetchBehaviour = options.FetchBehaviour;
    var operationCallback = options.operationCallback;
    self.serviceDelegate = function (currentBehaviour, serviceOperation, callback) {

        return FetchBehaviour && currentBehaviour instanceof FetchBehaviour ?
            serviceOperationDelegate.fetch(getFetchCallback(currentBehaviour, operationCallback, callback),
                getFetchCancelCallback(currentBehaviour)) : serviceOperationDelegate.request(serviceOperation,
                    getRequestCallback(currentBehaviour, serviceOperation, operationCallback, callback));
    };
    self.modelDelegate = function (currentBehaviour, modelOperation, callback) {

        return modelOperationDelegate.manipulate(modelOperation, getManipulateCallback(currentBehaviour,
            modelOperation, operationCallback, callback));
    };
    self.serviceMappingDelegate = function (currentBehaviour, callback) {

        return businessOperationDelegate.mapFromObjects(currentBehaviour.inputObjects,
            currentBehaviour.getProperty, currentBehaviour.getType() === BehaviourTypes.ONLINEACTION,
            getMapFromCallback(currentBehaviour, operationCallback, callback));
    };
    self.modelMappingDelegate = function (currentBehaviour, callback) {

        var operation = null;
        switch (currentBehaviour.getType()) {

            case BehaviourTypes.ONLINEACTION:
            case BehaviourTypes.OFFLINEACTION:
                operation = OperationType.MAPBETWEEN;
                break;
            case BehaviourTypes.ONLINESYNC:
            case BehaviourTypes.OFFLINESYNC:
                operation = OperationType.MAPTO;
                break;
        }
        switch (operation) {

            case OperationType.MAPTO:
                return businessOperationDelegate.mapToObjects(currentBehaviour.state.modelObjects ||
                    currentBehaviour.state.serviceObjects, currentBehaviour.getProperty,
                    getMappingCallback(currentBehaviour, operation, operationCallback, callback));
            case OperationType.MAPBETWEEN:
                return businessOperationDelegate.mapBetweenObjects(currentBehaviour.state.modelObjects ||
                    currentBehaviour.state.serviceObjects, currentBehaviour.inputObjects,
                    currentBehaviour.getProperty, getMappingCallback(currentBehaviour, operation,
                        operationCallback, callback));
        }
    };
};

BusinessControllerExt.prototype.cancelRunningBehaviour = function (behaviour) {

    if (typeof behaviour.cancel === 'function') {

        behaviour.cancel();
        behaviour.cancel = null;
    }
};

module.exports.BusinessControllerExt = BusinessControllerExt;
