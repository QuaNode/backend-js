/*jslint node: true */
/*jshint esversion: 6 */
'use strict';

let BusinessObjectMapping = require('./BusinessObjectMapping.js').BusinessObjectMapping;

var getInputObjectsReturn = function(objects, superProperty, getSubProperty, getInputObject) {

    return function() {

        var cb = arguments[0];
        var push = function(index, inputObjects) {

            setTimeout(function() {

                getInputObject(objects[index], superProperty, getSubProperty)(function(inputObject) {

                    inputObjects.push(inputObject);
                    if (objects[index + 1]) push(index + 1, inputObjects);
                    else if (typeof cb === 'function') cb(inputObjects);
                });
            }, 0);
        };
        if (Array.isArray(objects)) {

            if (objects[0]) push(0, []);
            else if (typeof cb === 'function') cb([]);
        } else if (objects) getInputObject(objects, superProperty, getSubProperty)(function(inputObject) {

            if (typeof cb === 'function') cb(inputObject);
        });
    };
};

var getInputObjectReturn = function(object, superProperty, getSubProperty, getProperty, relate,
    getInputObjects, getInputObject) {

    return function() {

        var cb = arguments[0];
        var inputObject = {};
        var businessObjectMapping = new BusinessObjectMapping();
        businessObjectMapping.map(inputObject, object, true, superProperty, getSubProperty || getProperty);
        if (relate) {

            businessObjectMapping.relate(inputObject, object, superProperty, getInputObjects, getInputObject,
                getSubProperty || getProperty)(function() {

                if (typeof cb === 'function') cb(inputObject);
            });
        } else if (typeof cb === 'function') cb(inputObject);
    };
};

var getBusinessObjectsReturn = function(objects, superProperty, getSubProperty, getBusinessObject) {

    return function() {

        var cb = arguments[0];
        var push = function(index, businessObjects) {

            setTimeout(function() {

                getBusinessObject(objects[index], superProperty, getSubProperty)(function(businessObject) {

                    businessObjects.push(businessObject);
                    if (objects[index + 1]) push(index + 1, businessObjects);
                    else if (typeof cb === 'function') cb(businessObjects);
                });
            }, 0);
        };
        if (objects[0]) push(0, []);
        else if (typeof cb === 'function') cb([]);
    };
};

var mapObjects = function(fromObjects, getBusinessObjectFunc, callback) {

    return function(getIdentificationAttributes, setBusinessObjects) {

        var getBusinessObjects = function(objects, superProperty, getSubProperty) {

            return getBusinessObjectsReturn(objects, superProperty, getSubProperty, getBusinessObject);
        };
        var getBusinessObject = getBusinessObjectFunc(getBusinessObjects, getIdentificationAttributes);
        if (typeof setBusinessObjects === 'function')(Array.isArray(fromObjects) ? getBusinessObjects : getBusinessObject)
            (fromObjects)(function(toObjects) {

                setBusinessObjects(toObjects);
                callback(toObjects);
            });
    };
};

var getBusinessObjectReturn_To = function(object, superProperty, getSubProperty, getProperty,
    getBusinessObjects, getBusinessObject) {

    return function() {

        var cb = arguments[0];
        var businessObject = {};
        var businessObjectMapping = new BusinessObjectMapping();
        businessObjectMapping.map(businessObject, object, true, superProperty, getSubProperty || getProperty);
        businessObjectMapping.relate(businessObject, object, superProperty, getBusinessObjects, getBusinessObject,
            getSubProperty || getProperty)(function() {

            if (typeof cb === 'function') cb(businessObject);
        });
    };
};

var getBusinessObjectReturn_Between = function(object, superProperty, getSubProperty, getProperty,
    inputObjects, getIdentificationAttributes) {

    return function() {

        var cb = arguments[0];
        var businessObject = {};
        var businessObjectMapping = new BusinessObjectMapping();
        businessObject = (Array.isArray(inputObjects) ? inputObjects : [inputObjects]).filter(function(inputObject) {

            return typeof getIdentificationAttributes === 'function' && getIdentificationAttributes()
                .every(function(idAttr) {

                    return object && businessObjectMapping.getAttributeValue(inputObject, getSubProperty || getProperty,
                        idAttr, superProperty) === object[idAttr];
                });
        })[0];
        businessObjectMapping.map(businessObject, object, false, superProperty, getSubProperty || getProperty);
        businessObjectMapping.deepMap(businessObject, object, superProperty, getSubProperty || getProperty);
        if (typeof cb === 'function') cb(businessObject);
    };
};

var BusinessOperationDelegate = function() {};

BusinessOperationDelegate.prototype.mapFromObjects = function(fromObjects, getProperty, relate, callback) {

    return function(setInputObjects) {

        var getInputObjects = function(objects, superProperty, getSubProperty) {

            return getInputObjectsReturn(objects, superProperty, getSubProperty, getInputObject);
        };
        var getInputObject = function(object, superProperty, getSubProperty) {

            return getInputObjectReturn(object, superProperty, getSubProperty, getProperty, relate,
                getInputObjects, getInputObject);
        };
        if (typeof setInputObjects === 'function') getInputObjects(fromObjects)(function(inputObjects) {

            setInputObjects(inputObjects);
            callback();
        });
    };
};

BusinessOperationDelegate.prototype.mapToObjects = function(fromObjects, getProperty, callback) {

    return mapObjects(fromObjects, function(getBusinessObjects) {

        var getBusinessObject = function(object, superProperty, getSubProperty) {

            return getBusinessObjectReturn_To(object, superProperty, getSubProperty, getProperty,
                getBusinessObjects, getBusinessObject);
        };
        return getBusinessObject;
    }, callback);
};

BusinessOperationDelegate.prototype.mapBetweenObjects = function(fromObjects, inputObjects, getProperty, callback) {

    return mapObjects(fromObjects, function(getBusinessObjects, getIdentificationAttributes) {

        var getBusinessObject = function(object, superProperty, getSubProperty) {

            return getBusinessObjectReturn_Between(object, superProperty, getSubProperty, getProperty,
                inputObjects, getIdentificationAttributes);
        };
        return getBusinessObject;
    }, callback);
};

module.exports.BusinessOperationDelegate = BusinessOperationDelegate;
