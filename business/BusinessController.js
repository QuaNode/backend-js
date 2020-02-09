/*jslint node: true */
/*jshint esversion: 6 */
'use strict';

let BusinessBehaviour = require('./BusinessBehaviour.js').BusinessBehaviour;
let BusinessBehaviourTypes = require('./BusinessBehaviour.js').BusinessBehaviourType;
let ModelOperationDelegate = require('./ModelOperationDelegate.js').ModelOperationDelegate;
let ServiceOperationDelegate = require('./ServiceOperationDelegate.js').ServiceOperationDelegate;
let BusinessOperationDelegate = require('./BusinessOperationDelegate.js').BusinessOperationDelegate;
let BusinessBehaviourQueue = require('./BusinessBehaviourQueue.js').BusinessBehaviourQueue;
let BusinessBehaviourCycle = require('./BusinessBehaviourCycle.js').BusinessBehaviourCycle;
let BusinessControllerExt = require('./BusinessControllerExt.js').BusinessControllerExt;

var BusinessController = function (options) {

    var self = this;
    var ignoreBehaviours = false;
    var modelController = options.modelController;
    var getModelMethods = options.getModelMethods;
    var serviceController = options.serviceController;
    var getServiceMethods = options.getServiceMethods;
    var cacheController = options.cacheController;
    var fetchMethod = options.fetchMethod;
    var FetchBehaviour = options.FetchBehaviour;
    var serviceOperations = BusinessBehaviourCycle.validateServiceOperations(options.serviceOperations);
    var modelOperations = BusinessBehaviourCycle.validateModelOperations(options.modelOperations);
    var operationCallback = options.operationCallback;
    if (FetchBehaviour && !(FetchBehaviour.prototype instanceof BusinessBehaviour))
        throw new Error('Invalid fetch behaviour type');
    var modelOperationDelegate = new ModelOperationDelegate({

        modelController: modelController,
        getModelMethods: getModelMethods,
        modelOperations: modelOperations
    });
    var serviceOperationDelegate = new ServiceOperationDelegate({

        modelController: modelController,
        ModelEntity: options.ModelEntity,
        QueryExpression: options.QueryExpression,
        ComparisonOperators: options.ComparisonOperators,
        serviceController: serviceController,
        getServiceMethods: getServiceMethods,
        serviceOperations: serviceOperations,
        cacheController: cacheController,
        fetchMethod: fetchMethod,
        FetchBehaviour: FetchBehaviour
    });
    var businessOperationDelegate = new BusinessOperationDelegate();
    var businessBehaviourQueue = new BusinessBehaviourQueue(BusinessBehaviourCycle.setComplete,
        BusinessBehaviourCycle.setError);
    var businessControllerExt = new BusinessControllerExt({

        modelOperationDelegate: modelOperationDelegate,
        serviceOperationDelegate: serviceOperationDelegate,
        businessOperationDelegate: businessOperationDelegate,
        FetchBehaviour: FetchBehaviour,
        operationCallback: operationCallback
    });
    var businessBehaviourCycle = new BusinessBehaviourCycle({

        businessController: self,
        serviceOperations: serviceOperations,
        modelOperations: modelOperations,
        BusinessBehaviourTypes: BusinessBehaviourTypes,
        businessBehaviourQueue: businessBehaviourQueue,
        serviceDelegate: businessControllerExt.serviceDelegate,
        modelDelegate: businessControllerExt.modelDelegate,
        serviceMappingDelegate: businessControllerExt.serviceMappingDelegate,
        modelMappingDelegate: businessControllerExt.modelMappingDelegate
    });
    self.modelController = modelController;
    self.serviceController = serviceController;
    self.cacheController = cacheController;
    self.getQueueLength = function () {

        return businessBehaviourQueue.length();
    };
    self.forceCancelBehaviours = function () {

        businessBehaviourQueue.cancelAll(businessControllerExt.cancelRunningBehaviour);
    };
    self.ignoreBehaviours = function () {

        ignoreBehaviours = true;
    };
    self.acceptBehaviours = function () {

        ignoreBehaviours = false;
    };
    self.runBehaviour = function (behaviour, getProperty, callback) {

        if (!(behaviour instanceof BusinessBehaviour)) {

            throw new Error('Invalid behaviour');
        }
        if (ignoreBehaviours || businessBehaviourQueue.isEnqueued(behaviour)) return function () { };
        behaviour.getProperty = getProperty || function (property) {

            return property;
        };
        behaviour.callback = callback;
        return businessBehaviourQueue.enqueue(behaviour, function () {

            businessBehaviourCycle.runNextBehaviour();
        }, businessControllerExt.cancelRunningBehaviour);
    };
};

module.exports.BusinessController = BusinessController;
