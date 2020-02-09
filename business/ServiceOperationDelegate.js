/*jslint node: true */
/*jshint esversion: 6 */
'use strict';

let ServiceController = require('../service/ServiceController.js').ServiceController;

var getRequestDelegate = function (serviceOperation, serviceOperations, serviceMethods, callback) {

    var self = this;
    return function (getServiceParameters, getEndPoint, setServiceObjects) {

        if (!self.serviceController) throw new Error('No service controller for online behaviour');
        for (var t = 0; t < serviceOperations.length; t++) {

            if (typeof self.serviceController[serviceMethods[serviceOperations[t]]] !== 'function')
                throw new Error('Invalid service method');
        }
        var requestHandler = function (serviceObjects, error) {

            if (typeof setServiceObjects === 'function' && setServiceObjects(serviceObjects, error) &&
                serviceObjects) {

                callback(serviceObjects, error);
            } else callback(null, error);
        };
        var sp = (typeof getServiceParameters === 'function' && getServiceParameters()) || [];
        if (typeof getEndPoint === 'function') {

            var ep = getEndPoint();
            self.serviceController[serviceMethods[serviceOperation]](sp, ep, requestHandler);
        } else {

            requestHandler();
        }
    };
};

var getFetchDelegate = function (fetchMethod, setCancel, callback) {

    var self = this;
    return function (getResourceInfo, getResume, setResourceInfo) {

        if (!self.cacheController) throw new Error('No cache controller for cache behaviour');
        if (typeof self.cacheController[fetchMethod] !== 'function') throw new Error('Invalid fetch method');
        var resource = null;
        var fetchHandler = function (finished, bytesLoaded, error) {

            if (typeof setResourceInfo === 'function') setResourceInfo(resource, bytesLoaded, error);
            callback(finished && resource, error);
        };
        var resume = (typeof getResume === 'function' && getResume() && true) || false;
        if (typeof getResourceInfo === 'function') {

            resource = getResourceInfo();
            var cancel = self.cacheController[fetchMethod](resource, resume, fetchHandler);
            if (typeof setCancel === 'function') setCancel(cancel);
        } else {

            fetchHandler();
        }
    };
};

var getObjectsByIDFunc = function (modelController, options) {

    return function (id, value, modelEntity, callback) {

        var queryByID = typeof options.QueryExpression === 'function' && [new (options.QueryExpression)({

            fieldName: id,
            comparisonOperator: options.ComparisonOperators && options.ComparisonOperators.EQUAL,
            fieldValue: value
        })];
        if (modelController && typeof modelController.getObjects === 'function') modelController.getObjects(queryByID, modelEntity,
            function (mObjects, error) {

                callback(Array.isArray(mObjects) ? mObjects : mObjects && mObjects.modelObjects, error);
            });
    };
};

var ServiceOperationDelegate = function (options) {

    var self = this;
    var modelController = options.modelController;
    var serviceController = options.serviceController || new ServiceController(options.serviceControllerOptions || {

        createModelEntity: options.ModelEntity && options.ModelEntity.createModelEntity,
        getObjectsByID: getObjectsByIDFunc(modelController, options),
        newObjects: modelController && modelController.newObjects,
        save: modelController && modelController.save,
        objectAttributesMethod: 'getObjectAttributes'
    });
    var getServiceMethods = options.getServiceMethods || function (index) {

        var methods = ['request', 'authenticate'];
        return index === undefined ? methods : methods[index];
    };
    var serviceOperations = options.serviceOperations;
    var cacheController = options.cacheController;
    var fetchMethod = options.fetchMethod || 'downloadResource';
    var serviceMethods = {};
    if (serviceController) {

        if (typeof getServiceMethods !== 'function' || !(Array.isArray(getServiceMethods())) ||
            getServiceMethods().length !== 2) throw new Error('Invalid service methods');
        for (var t = 0; t < serviceOperations.length; t++) {

            serviceMethods[serviceOperations[t]] = getServiceMethods(t, serviceOperations[t]);
        }
    }
    if (cacheController) {

        if (typeof fetchMethod !== 'string') throw new Error('Invalid fetch methods');
    }
    self.serviceController = serviceController;
    self.cacheController = cacheController;
    self.request = function (serviceOperation, callback) {

        return getRequestDelegate.apply(self, [serviceOperation, serviceOperations, serviceMethods, callback]);
    };
    self.fetch = function (callback, setCancel) {

        return getFetchDelegate.apply(self, [fetchMethod, setCancel, callback]);
    };
};

module.exports.ServiceOperationDelegate = ServiceOperationDelegate;
