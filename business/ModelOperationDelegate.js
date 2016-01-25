/*jslint node: true */
'use strict';

var getManipulateDelegate = function (modelOperation, modelOperations, modelMethods, callback) {

    var self = this;
    return function (getQueryExpressionsOrObjsAttributes, getModelEntity, setModelObjects) {

        if (!self.modelController) throw new Error('no model controller for offline behaviour');
        for (var c = 0; c < modelOperations.length; c++) {

            if (typeof self.modelController[modelMethods[modelOperations[c]]] !== 'function')
                throw new Error('invalid model method');
        }
        var modelCallback = function (modelObjects, error) {

            if (typeof setModelObjects === 'function' && setModelObjects(modelObjects, error) &&
                modelObjects) {

                callback(modelObjects, error);
            } else callback(null, error);
        };
        var qe = (typeof getQueryExpressionsOrObjsAttributes === 'function' && getQueryExpressionsOrObjsAttributes()) || [];
        if (typeof getModelEntity === 'function') {

            var md = getModelEntity();
            self.modelController[modelMethods[modelOperation]](qe, md, modelCallback);
        } else {

            modelCallback();
        }
    };
};

var ModelOperationDelegate = function (options) {

    var self = this;
    var modelController = options.modelController;
    var getModelMethods = options.getModelMethods || function (index) {

            var methods = ['newObjects', 'getObjects', 'removeObjects'];
            return index === undefined ? methods : methods[index];
        };
    var modelOperations = options.modelOperations;
    var modelMethods = {};
    if (modelController) {

        if (typeof getModelMethods !== 'function' || !(Array.isArray(getModelMethods())) ||
            getModelMethods().length !== 3) throw new Error('invalid model methods');
        for (var c = 0; c < modelOperations.length; c++) {

            modelMethods[modelOperations[c]] = getModelMethods(c, modelOperations[c]);
            if (typeof modelController[modelMethods[modelOperations[c]]] !== 'function') throw new Error('invalid model method');
        }
    }
    self.modelController = modelController;
    self.manipulate = function (modelOperation, callback) {

        return getManipulateDelegate.apply(self, [modelOperation, modelOperations, modelMethods, callback]);
    };
};

module.exports.ModelOperationDelegate = ModelOperationDelegate;
