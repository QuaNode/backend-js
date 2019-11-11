/*jslint node: true */
'use strict';

var BusinessOperation = {

    SERVICEOBJECTMAPPING: 'ServiceObjectMapping',
    MODELOBJECTMAPPING: 'ModelObjectMapping',
    ERRORHANDLING: 'ErrorHandling'
};

var ServiceOperation = {

    AUTHENTICATION: 'Authentication',
    REQUEST: 'Request'
};

var ModelOperation = {

    QUERY: 'Query',
    DELETE: 'Delete',
    INSERT: 'Insert'
};

var validateServiceOperations = function(serviceOperations) {

    return (Array.isArray(serviceOperations) && serviceOperations) || [ServiceOperation.REQUEST, ServiceOperation.AUTHENTICATION];
};

var validateModelOperations = function(modelOperations) {

    return (Array.isArray(modelOperations) && modelOperations) || [ModelOperation.INSERT, ModelOperation.DELETE, ModelOperation.QUERY];
};

var ignoreBusinessOperation = function(currentBehaviour, businessOperation, remove) {

    var index = currentBehaviour.state.businessOperations.indexOf(businessOperation);
    if (remove && index > -1) currentBehaviour.state.businessOperations.splice(index, 1);
    return index === -1;
};

var endRunningBehaviour = function(currentBehaviour, options) {

    var self = this;
    var businessBehaviourQueue = options.businessBehaviourQueue;
    var businessController = options.businessController;
    ignoreBusinessOperation(currentBehaviour, BusinessOperation.MODELOBJECTMAPPING, true);
    if (businessBehaviourQueue.suspend(currentBehaviour)) return;
    var businessDelegate = function(getError) {

        if (typeof getError === 'function') currentBehaviour.state.error = getError(currentBehaviour.state.error) || undefined;
        ignoreBusinessOperation(currentBehaviour, BusinessOperation.ERRORHANDLING, true);
        if (businessBehaviourQueue.suspend(currentBehaviour)) return;
        if (businessBehaviourQueue.dequeue(currentBehaviour)) businessBehaviourQueue.finish(currentBehaviour, function() {

            self.runNextBehaviour();
        });
        else console.log('Behaviour already dequeued, may be misuse of next()');
    };
    if (ignoreBusinessOperation(currentBehaviour, BusinessOperation.ERRORHANDLING, false) ||
        !currentBehaviour.beginBusinessOperation(BusinessOperation.ERRORHANDLING, businessController, businessDelegate)) {

        businessDelegate();
    }
};

var continueRunningBehaviour = function(currentBehaviour, options) {

    var self = this;
    var businessBehaviourQueue = options.businessBehaviourQueue;
    var businessController = options.businessController;
    var modelDelegate = options.modelDelegate;
    var modelMappingDelegate = options.modelMappingDelegate;
    ignoreBusinessOperation(currentBehaviour, BusinessOperation.SERVICEOBJECTMAPPING, true);
    if (businessBehaviourQueue.suspend(currentBehaviour)) return;
    var modelOperation = currentBehaviour.state.modelOperations.pop();
    if (modelOperation) {

        if (!currentBehaviour.beginModelOperation(modelOperation, businessController,
                modelDelegate(currentBehaviour, modelOperation, function() {

                    continueRunningBehaviour.apply(self, [currentBehaviour, options]);
                }))) {

            continueRunningBehaviour.apply(self, [currentBehaviour, options]);
        }
    } else {

        var businessCallback = function(businessObjects) {

            if (businessObjects) currentBehaviour.state.businessObjects = businessObjects;
            endRunningBehaviour.apply(self, [currentBehaviour, options]);
        };
        if (ignoreBusinessOperation(currentBehaviour, BusinessOperation.MODELOBJECTMAPPING, false) ||
            !currentBehaviour.beginBusinessOperation(BusinessOperation.MODELOBJECTMAPPING, businessController,
                modelMappingDelegate(currentBehaviour, businessCallback))) {

            businessCallback();
        }
    }
};

var beginRunnigBehaviour = function(currentBehaviour, options) {

    var self = this;
    var businessBehaviourQueue = options.businessBehaviourQueue;
    var businessController = options.businessController;
    var serviceDelegate = options.serviceDelegate;
    var serviceMappingDelegate = options.serviceMappingDelegate;
    if (businessBehaviourQueue.suspend(currentBehaviour)) return;
    var serviceOperation = currentBehaviour.state.serviceOperations.pop();
    var businessCallback = function() {

        if (!currentBehaviour.beginServiceOperation(serviceOperation, businessController,
                serviceDelegate(currentBehaviour, serviceOperation,
                    function() {

                        beginRunnigBehaviour.apply(self, [currentBehaviour, options]);
                    }))) {

            beginRunnigBehaviour.apply(self, [currentBehaviour, options]);
        }
    };
    if (serviceOperation) {

        if (ignoreBusinessOperation(currentBehaviour, BusinessOperation.SERVICEOBJECTMAPPING, false) ||
            !currentBehaviour.beginBusinessOperation(BusinessOperation.SERVICEOBJECTMAPPING, businessController,
                serviceMappingDelegate(currentBehaviour, businessCallback))) {

            businessCallback();
        }
    } else {

        continueRunningBehaviour.apply(self, [currentBehaviour, options]);
    }
};

var BusinessBehaviourCycle = function(options) {

    var self = this;
    var serviceOperations = validateServiceOperations(options.serviceOperations);
    var modelOperations = validateModelOperations(options.modelOperations);
    var businessOperations = [BusinessOperation.ERRORHANDLING, BusinessOperation.MODELOBJECTMAPPING, BusinessOperation.SERVICEOBJECTMAPPING];
    if (businessOperations.concat(serviceOperations).concat(modelOperations).some(function(operation, i, operations) {

            return typeof operation !== 'string' || operations.filter(function(op) {

                return operation === op;
            }).length > 1;
        })) throw new Error('Operations should be an array of unique strings');
    var businessBehaviourQueue = options.businessBehaviourQueue;
    var BusinessBehaviourTypes = options.BusinessBehaviourTypes;
    self.runNextBehaviour = function() {

        var currentBehaviour = businessBehaviourQueue.execute();
        if (currentBehaviour) {

            currentBehaviour.prepareOperations(serviceOperations, modelOperations, businessOperations);
            switch (currentBehaviour.getType()) {

                case BusinessBehaviourTypes.ONLINESYNC:
                case BusinessBehaviourTypes.ONLINEACTION:
                    beginRunnigBehaviour.apply(self, [currentBehaviour, options]);
                    break;
                case BusinessBehaviourTypes.OFFLINESYNC:
                case BusinessBehaviourTypes.OFFLINEACTION:
                    continueRunningBehaviour.apply(self, [currentBehaviour, options]);
                    break;
            }
        }
    };
};

BusinessBehaviourCycle.setComplete = function(currentBehaviour, completionDelegate) {

    if (typeof currentBehaviour.callback === 'function') currentBehaviour.callback((function() {

        return currentBehaviour.state.businessObjects || currentBehaviour.state.modelObjects ||
            currentBehaviour.state.serviceObjects || [];
    })(), currentBehaviour.state.error, completionDelegate);
};

BusinessBehaviourCycle.setError = function(behaviour, err) {

    switch (err) {

        case 'cancelled':
            behaviour.state.error = new Error('Behaviour cancelled');
            break;
        case 'failed':
            behaviour.state.error = new Error('Mandatory behaviour failed');
            break;
    }
};

BusinessBehaviourCycle.validateServiceOperations = validateServiceOperations;

BusinessBehaviourCycle.validateModelOperations = validateModelOperations;

module.exports.BusinessBehaviourCycle = BusinessBehaviourCycle;

module.exports.BusinessOperation = BusinessOperation;

module.exports.ServiceOperation = ServiceOperation;
