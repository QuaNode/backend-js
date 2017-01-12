/*jslint node: true */
'use strict';

var copy = require('shallow-copy');

var getParsedValue = function(value, type) {

    switch (type) {
        case Number:
            try {

                if (typeof value === 'string') value = value.indexOf('.') > -1 ? parseFloat(value) : parseInt(value);
                if (isNaN(value)) value = null;
                else if (typeof value !== 'number') value = null;
            } catch (e) {

                value = null;
            }
            break;
        case Boolean:
            if (typeof value === 'string') value = value.toLowerCase();
            if (value === 'true') return true;
            else if (value === 'false') return false;
            else return null;
            break;
        case Date:
            try {

                if (isNaN(Date.parse(value))) value = null;
                else value = new Date(value);
            } catch (e) {

                value = null;
            }
            break;
        default:
            if (Array.isArray(type)) {

                var isValueArray = Array.isArray(value);
                var isValueString = typeof value === 'string';
                if (isValueArray || isValueString) {

                    return (isValueString ? value.split(',') : value).map(function(subValue) {

                        return (type[0] && getParsedValue(subValue, type[0])) || subValue;
                    });
                }
            } else if (typeof type === 'object' && typeof value === 'object') {

                for (var property in type) {

                    if (type.hasOwnProperty(property)) {

                        value[property] = getParsedValue(value[property], type[property]);
                    }
                }
            }
            break;
    }
    return value;
};

var getServiceValue = function(serviceObject, attributeMetadata, modelAttributes, key, value) {

    var serviceAttributeName = attributeMetadata.name;
    var modelAttributeName = attributeMetadata.model;
    if (typeof attributeMetadata.getValue === 'function') return getParsedValue(attributeMetadata.getValue(serviceObject),
        modelAttributes && modelAttributes[modelAttributeName]);
    var serviceValue = null;
    if (serviceAttributeName) {

        if (Array.isArray(serviceObject)) {

            for (var k = 0; k < serviceObject.length; k++) {

                if (serviceObject[k][serviceAttributeName]) {

                    serviceValue = serviceObject[k][serviceAttributeName];
                    break;
                } else if (key && value && serviceObject[k][key] === serviceAttributeName) {

                    serviceValue = serviceObject[k][value];
                    break;
                }
            }
        } else if (typeof serviceObject === 'object') {

            var serviceAttributePathComponents = serviceAttributeName.split('.');
            serviceValue = serviceObject;
            for (var g = 0; g < serviceAttributePathComponents.length && serviceValue; g++) {

                var attributeName = serviceAttributePathComponents[g];
                serviceValue = serviceValue[attributeName];
                if (Array.isArray(serviceValue)) {

                    var attribMetadata = copy(attributeMetadata);
                    attribMetadata.name = serviceAttributeName.split(attributeName + '.')[1];
                    if (attribMetadata.name) return getServiceValue(serviceValue, attribMetadata, modelAttributes, key, value);
                }
            }
        }
    }
    return getParsedValue(serviceValue, modelAttributes && modelAttributes[modelAttributeName]);
};

module.exports.ServiceObjectMapping = function() {};

module.exports.ServiceObjectMapping.prototype.mapServiceObject = function(serviceObject, objectMetadata, modelAttributes,
    modelObjects, cb) {

    var self = this;
    var mapAndSyncServiceAttributesToModelObject = function(mObject, mOperation) {

        for (var n = 0; n < objectMetadata.attributes.length; n++) {

            var attributeMetadata = objectMetadata.attributes[n];
            var serviceValue = getServiceValue(serviceObject, attributeMetadata, modelAttributes,
                objectMetadata.attributesKeyName, objectMetadata.attributesValueName);
            if (serviceValue && attributeMetadata.model) {

                if (attributeMetadata.metadata) {

                    /*if (Array.isArray(serviceValue)) { //to be continueued Ahmed

                     for (var i = 0; i < serviceValue.length; i++) {

                     }
                     }*/
                } else mObject[attributeMetadata.model] = serviceValue;
            }
        }
        cb(mObject, mOperation);
    };
    var modelObject = {};
    var modelOperation = 'insert';
    var idServiceValue = self.getIDServiceValue(serviceObject, objectMetadata, modelAttributes);
    if (modelObjects.some(function(mObject) {

            var isIt = mObject[objectMetadata.id] === idServiceValue;
            if (isIt) {

                modelObject = mObject;
                modelOperation = 'update';
            }
            return isIt;
        })) {

        mapAndSyncServiceAttributesToModelObject(modelObject, modelOperation);
    } else mapAndSyncServiceAttributesToModelObject(modelObject, modelOperation);
};

module.exports.ServiceObjectMapping.prototype.getIDServiceValue = function(serviceObject, objectMetadata, modelAttributes) {

    var idServiceValue = null;
    if (objectMetadata.id) {

        var identificationAttributesMetadata = objectMetadata.attributes.filter(function(attributeMetadata) {

            return attributeMetadata.model === objectMetadata.id;
        });
        if (identificationAttributesMetadata.length > 0) {

            idServiceValue = getServiceValue(serviceObject, identificationAttributesMetadata[0], modelAttributes,
                objectMetadata.attributesKeyName, objectMetadata.attributesValueName);
        }
    }
    return idServiceValue;
};
