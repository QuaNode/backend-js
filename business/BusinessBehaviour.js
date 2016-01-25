/*jslint node: true */
'use strict';

var BusinessBehaviourExt = require('./BusinessBehaviourExt.js').BusinessBehaviourExt;
var BusinessLanguage = require('./BusinessLanguage.js').BusinessLanguage;
var define = require('define-js');

var BusinessBehaviourType = {

    ONLINESYNC: 0,
    OFFLINESYNC: 1,
    ONLINEACTION: 2,
    OFFLINEACTION: 3
};

module.exports.BusinessBehaviour = define(function (init) {

    return function (options) {

        var languageParameters = {

            middlewares: {},
            delegates: {},
            watchers: {},
            useConditions: {},
            beginConditions: {}
        };
        var self = init.apply(this, [languageParameters]).self();
        var businessBehaviourExt = new BusinessBehaviourExt(languageParameters);
        var type = null;
        self.priority = options.priority;
        self.inputObjects = options.inputObjects;
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
            throw new Error('invalid behaviour type');
        };
        self.setType(options.type);
        self.beginServiceOperation = function (serviceOperation) {

            return businessBehaviourExt.beginServiceOperation.apply(businessBehaviourExt, arguments);
        };
        self.beginModelOperation = function (modelOperation) {

            return businessBehaviourExt.beginModelOperation.apply(businessBehaviourExt, arguments);
        };
        self.beginBusinessOperation = function (businessOperation) {

            return businessBehaviourExt.beginBusinessOperation.apply(businessBehaviourExt, arguments);
        };
    };
}).extend(BusinessLanguage).parameters({});

module.exports.BusinessBehaviour.prototype.hasMandatoryBehaviour = function (behaviour) {

    var self = this;
    if (behaviour && self.mandatoryBehaviour === behaviour) {

        return true;
    } else if (self.mandatoryBehaviour instanceof module.exports.BusinessBehaviour) {

        return self.mandatoryBehaviour.hasMandatoryBehaviour(behaviour);
    } else {

        return false;
    }
};

module.exports.BusinessBehaviour.prototype.isEqualToBehaviour = function (behaviour) {

    var self = this;
    if (self === behaviour) {

        return true;
    } else {

        if (self instanceof behaviour.constructor) {

            if (self.getType() === behaviour.getType()) {

                if (self.priority === behaviour.priority) {

                    if (JSON.stringify(self.inputObjects) === JSON.stringify(behaviour.inputObjects)) {

                        if (self.searchText === behaviour.searchText) {

                            return true;
                        }
                    }
                }
            }
        }
    }
    return false;
};

module.exports.BusinessBehaviourType = BusinessBehaviourType;
