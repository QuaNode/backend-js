/*jslint node: true */
/*jshint esversion: 6 */
'use strict';

let OperationDelegateApp = require('./OperationDelegateApp.js').OperationDelegateApp;
let BusinessOperation = require('./BusinessBehaviourCycle.js').BusinessOperation;
let parse = require('parseparams');

var ifCondition = function (operation, conditions) {

    if (typeof conditions[operation] === 'function' && !conditions[operation]()) return false;
    else if (typeof conditions[operation] === 'boolean' && !conditions[operation]) return false;
    return true;
};

var middleware = function (operation, businessController, index, next, middlewares, useConditions) {

    if (middlewares[operation] && index > -1 && index < middlewares[operation].length &&
        ifCondition(operation, useConditions)) {

        if (parse(middlewares[operation][index])[2] === 'next')
            middlewares[operation][index](operation, businessController, function () {

                middleware(operation, businessController, index + 1, next, middlewares, useConditions);
            }, next); else {

            for (var i = index; i < middlewares[operation].length; i++) {

                middlewares[operation][i](operation, businessController);
            }
            next();
        }
    } else next();
};

var getOperationFunc = function (attribute) {

    return function () {

        this.data[attribute] = arguments[0];
        return this;
    };
};

var getOperationCancelFunc = function (delegate) {

    return function () {

        delegate();
    };
};

var getServiceOperation = function (operationDelegateApp, serviceOperation, delegate) {

    return {

        data: {

            append: null,
            parameters: null,
            service: null,
            callback: null,
        },
        apply: function (parameters, service, callback, append) {

            operationDelegateApp.serviceApply.apply(this, [serviceOperation, delegate, parameters,
                service, callback, append]);
        },
        parameters: getOperationFunc('parameters'),
        service: getOperationFunc('service'),
        append: getOperationFunc('append'),
        callback: getOperationFunc('callback'),
        cancel: getOperationCancelFunc(delegate)
    };
};

var getModelOperation = function (operationDelegateApp, modelOperation, delegate) {

    return {

        data: {

            append: null,
            query: null,
            aggregate: null,
            filter: null,
            objects: null,
            entity: null,
            callback: null
        },
        apply: function (queryOrObjects, entity, callback, append) {

            operationDelegateApp.modelApply.apply(this, [modelOperation, delegate, queryOrObjects,
                entity, callback, append]);
        },
        objects: getOperationFunc('objects'),
        query: getOperationFunc('query'),
        aggregate: getOperationFunc('aggregate'),
        filter: getOperationFunc('filter'),
        entity: getOperationFunc('entity'),
        append: getOperationFunc('append'),
        callback: getOperationFunc('callback'),
        cancel: getOperationCancelFunc(delegate)
    };
};

var getServiceMappingOperation = function (operationDelegateApp, businessOperation, delegate) {

    return {

        data: {

            callback: null
        },
        apply: function (callback) {

            operationDelegateApp.serviceInputMappingApply.apply(this, [businessOperation, delegate,
                callback]);
        },
        callback: getOperationFunc('callback'),
        cancel: getOperationCancelFunc(delegate)
    };
};

var getModelMappingOperation = function (operationDelegateApp, businessOperation, delegate) {

    return {

        data: {

            identifiers: null,
            callback: null
        },
        apply: function (identifiers, callback) {

            operationDelegateApp.modelOutputMappingApply.apply(this, [businessOperation, delegate,
                identifiers, callback]);
        },
        identifiers: getOperationFunc('identifiers'),
        callback: getOperationFunc('callback'),
        cancel: getOperationCancelFunc(delegate)
    };
};

var getErrorHandlingOperation = function (operationDelegateApp, businessOperation, delegate) {

    return {

        data: {

            error: null
        },
        apply: function (error) {

            operationDelegateApp.errorHandlingApply.apply(this, [businessOperation, delegate, error]);
        },
        error: getOperationFunc('error'),
        cancel: getOperationCancelFunc(delegate)
    };
};

var BusinessBehaviourExt = function (options) {

    var self = this;
    var middlewares = options.middlewares;
    var delegates = options.delegates;
    var watchers = options.watchers;
    var useConditions = options.useConditions;
    var beginConditions = options.beginConditions;
    var operationDelegateApp = new OperationDelegateApp({

        watchers: watchers
    });
    self.beginServiceOperation = function (serviceOperation, businessController, delegate) {

        var delegateExisted = delegates[serviceOperation] && true;
        middleware(serviceOperation, businessController, 0, function () {

            if (delegateExisted && ifCondition(serviceOperation, beginConditions))
                delegates[serviceOperation](serviceOperation, businessController,
                    getServiceOperation(operationDelegateApp, serviceOperation, delegate));
            else if (delegateExisted) delegate();
        }, middlewares, useConditions);
        return delegateExisted;
    };
    self.beginModelOperation = function (modelOperation, businessController, delegate) {

        var delegateExisted = delegates[modelOperation] && true;
        middleware(modelOperation, businessController, 0, function () {

            if (delegateExisted && ifCondition(modelOperation, beginConditions))
                delegates[modelOperation](modelOperation, businessController,
                    getModelOperation(operationDelegateApp, modelOperation, delegate));
            else if (delegateExisted) delegate();
        }, middlewares, useConditions);
        return delegateExisted;
    };
    self.beginBusinessOperation = function (businessOperation, businessController, delegate) {

        var delegateExisted = delegates[businessOperation] && true;
        middleware(businessOperation, businessController, 0, function () {

            if (delegateExisted && ifCondition(businessOperation, beginConditions)) {

                switch (businessOperation) {

                    case BusinessOperation.SERVICEOBJECTMAPPING:
                        delegates[businessOperation](businessOperation, businessController,
                            getServiceMappingOperation(operationDelegateApp, businessOperation, delegate));
                        break;
                    case BusinessOperation.MODELOBJECTMAPPING:
                        delegates[businessOperation](businessOperation, businessController,
                            getModelMappingOperation(operationDelegateApp, businessOperation, delegate));
                        break;
                    case BusinessOperation.ERRORHANDLING:
                        delegates[businessOperation](businessOperation, businessController,
                            getErrorHandlingOperation(operationDelegateApp, businessOperation, delegate));
                        break;
                }
            } else if (delegateExisted) delegate();
        }, middlewares, useConditions);
        return delegateExisted;
    };
};

module.exports.BusinessBehaviourExt = BusinessBehaviourExt;
