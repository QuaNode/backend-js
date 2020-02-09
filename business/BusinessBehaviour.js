/*jslint node: true */
/*jshint esversion: 6 */
'use strict';

let copy = require('shallow-copy');
let BusinessBehaviourExt = require('./BusinessBehaviourExt.js').BusinessBehaviourExt;
let BusinessLanguage = require('./BusinessLanguage.js').BusinessLanguage;
let define = require('define-js');

var BusinessBehaviourType = {

    ONLINESYNC: 0,
    OFFLINESYNC: 1,
    ONLINEACTION: 2,
    OFFLINEACTION: 3
};

module.exports.BusinessBehaviour = define(function (init) {

    return function (options) {

        if (typeof options !== 'object') throw new Error('Invalid behaviour parameters');
        var languageParameters = {

            middlewares: {},
            delegates: {},
            watchers: {},
            useConditions: {},
            beginConditions: {},
        };
        var self = init.apply(this, [languageParameters]).self();
        var businessBehaviourExt = new BusinessBehaviourExt(languageParameters);
        var type = null;
        self.priority = options.priority;
        var parameters = options.inputObjects;
        Object.defineProperty(self, 'inputObjects', {

            enumerable: true,
            get: function () {

                return parameters;
            },
            set: function (inputObjects) {

                parameters = inputObjects;
            }
        });
        Object.defineProperty(self, 'parameters', {

            enumerable: true,
            get: function () {

                return parameters;
            },
            set: function (params) {

                parameters = params;
            }
        });
        self.state = {};
        self.searchText = options.searchText;
        self.mandatoryBehaviour = options.mandatoryBehaviour;
        self.getType = function () {

            return type;
        };
        self.setType = function (typeParameter) {

            if (typeParameter !== undefined) {

                for (var behaviourType in BusinessBehaviourType) {

                    if (BusinessBehaviourType.hasOwnProperty(behaviourType)) {

                        if (BusinessBehaviourType[behaviourType] === typeParameter) {

                            type = typeParameter;
                            return;
                        }
                    }
                }
            }
            throw new Error('Invalid behaviour type');
        };
        self.setType(options.type);
        self.prepareOperations = function (serviceOperations, modelOperations, businessOperations) {

            self.state.serviceOperations = copy(serviceOperations);
            self.state.modelOperations = copy(modelOperations);
            self.state.businessOperations = copy(businessOperations);
            Object.keys(languageParameters.delegates).every(function (delegate) {

                if (businessOperations.concat(serviceOperations).concat(modelOperations).indexOf(delegate) === -1)
                    throw new Error('Invalid operation name: ' + delegate);
            });
        };
        self.beginServiceOperation = function (serviceOperation) {

            return businessBehaviourExt.beginServiceOperation.apply(self, arguments);
        };
        self.beginModelOperation = function (modelOperation) {

            return businessBehaviourExt.beginModelOperation.apply(self, arguments);
        };
        self.beginBusinessOperation = function (businessOperation) {

            return businessBehaviourExt.beginBusinessOperation.apply(self, arguments);
        };
    };
}).extend(BusinessLanguage).parameters({});

module.exports.BusinessBehaviour.prototype.hasMandatoryBehaviour = function (behaviour) {

    var self = this;
    if (behaviour && self.mandatoryBehaviour === behaviour) return true;
    else if (self.mandatoryBehaviour instanceof module.exports.BusinessBehaviour) {

        return self.mandatoryBehaviour.hasMandatoryBehaviour(behaviour);
    } else return false;
};

module.exports.BusinessBehaviour.prototype.isEqualToBehaviour = function (behaviour) {

    return this === behaviour;
};

module.exports.BusinessBehaviourType = BusinessBehaviourType;
