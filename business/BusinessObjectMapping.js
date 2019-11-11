/*jslint node: true */
'use strict';

var forEachProperty = function (rightObject, getProperty, callback, finạlly) {

    var properties = typeof getProperty === 'function' ? getProperty() : getProperty;
    var useProperties = typeof properties === 'object' && !Array.isArray(properties);
    if (!useProperties) properties = rightObject;
    var getMappedProperty = function (property, superProperty) {

        return useProperties ? properties[property] : typeof getProperty === 'function' ?
            getProperty(property, superProperty) : property;
    };
    if (typeof callback === 'function' && rightObject) {

        var keys = Object.keys(properties);
        var next = function (index) {

            var property = keys[index];
            if (property) {

                var cb = callback(property, getMappedProperty);
                var continṵe = function () {

                    if (keys[index + 1]) next(index + 1);
                    else if (typeof finạlly === 'function') finạlly();
                };
                if (typeof cb === 'function') cb(continṵe);
                else continṵe();
            } else if (typeof finạlly === 'function') finạlly();
        };
        next(0);
    } else if (typeof finạlly === 'function') finạlly();
    return getMappedProperty;
};

var getRelateReturn = function (leftObject, rightObject, superProperty, getObjects, getObject, getProperty, superProperties) {

    var self = this;
    return function () {

        var callback = arguments[0];
        if (leftObject) self.forEachRelation(rightObject, superProperty, getProperty, function (property, mappedProperty,
            getSubProperty) {

            if (superProperties.indexOf(superProperty) === -1) {

                return function () {

                    var cb = arguments[0];
                    if (superProperty) superProperties.push(superProperty);
                    var relate = function (businessObject) {

                        if (mappedProperty) {

                            if (typeof mappedProperty === 'function') mappedProperty(leftObject, businessObject);
                            else if (typeof mappedProperty === 'string') leftObject[mappedProperty] = businessObject;
                            else throw new Error('Invalid property name');
                        } else if (mappedProperty === null) {

                            self.map(leftObject, businessObject, true, superProperty, getProperty);
                        }
                        cb();
                    };
                    if (rightObject[property] && typeof getObjects === 'function' && typeof getObject === 'function')
                        (Array.isArray(rightObject[property]) ? getObjects : getObject)(rightObject[property], property,
                            getSubProperty)(function (businessObject) {

                                relate(businessObject);
                            });
                    else relate(null);
                };
            }
        }, callback);
        else callback();
    };
};

var BusinessObjectMapping = function () {

    var self = this;
    var superProperties = [];
    self.reset = function () {

        superProperties = [];
    };
    self.relate = function (leftObject, rightObject, superProperty, getObjects, getObject, getProperty) {

        return getRelateReturn.apply(self, [leftObject, rightObject, superProperty, getObjects, getObject, getProperty,
            superProperties
        ]);
    };
};

BusinessObjectMapping.prototype.getAttributeValue = function (inputObject, getProperty, property, superProperty) {

    if (typeof property !== 'string') throw new Error('Invalid property name');
    var mappedIdAttr = forEachProperty(null, getProperty)(property, superProperty);
    if (typeof mappedIdAttr !== 'string' && typeof mappedIdAttr !== 'function')
        throw new Error('Invalid property name');
    if (typeof mappedIdAttr === 'function')
        return mappedIdAttr(inputObject);
    else return inputObject && inputObject[mappedIdAttr];
};

BusinessObjectMapping.prototype.forEachAttribute = function (rightObject, superProperty, getProperty, callback, finạlly) {

    var isValidValue = function (value) {

        if (value === null) return true;
        if (value instanceof Date) return true;
        if (Array.isArray(value) && value.length > 0 && value.every(function (subValue) {

            return isValidValue(subValue);
        })) return true;
        return !!(typeof value !== 'object' && typeof value !== 'function');

    };
    forEachProperty(rightObject, getProperty, function (property, getMappedProperty) {

        var mappedProperty = getMappedProperty(property, superProperty);
        if (mappedProperty && isValidValue(rightObject[property])) {

            return callback(property, mappedProperty);
        }
    }, finạlly);
};

BusinessObjectMapping.prototype.forEachRelation = function (rightObject, superProperty, getProperty, callback, finạlly) {

    var isValidObject = function (object) {

        if (Array.isArray(object) && object.every(function (subObject) {

            return isValidObject(subObject);
        })) {

            return true;
        }
        return !!(typeof object === 'object' && !Array.isArray(object) && !(object instanceof Date) &&
            typeof object !== 'function');

    };
    forEachProperty(rightObject, getProperty, function (property, getMappedProperty) {

        var mappedProperty = getMappedProperty(property, superProperty);
        if (mappedProperty !== undefined && isValidObject(rightObject[property])) {

            var getSubProperty = Array.isArray(mappedProperty) ? mappedProperty[1] : typeof mappedProperty === 'object' ?
                mappedProperty.mapping : getProperty;
            if (Array.isArray(mappedProperty) && typeof mappedProperty[0] === 'string')
                return callback(property, mappedProperty[0], getSubProperty);
            else if (typeof mappedProperty === 'object' && typeof mappedProperty.property === 'string')
                return callback(property, mappedProperty.property, getSubProperty);
            else
                return callback(property, mappedProperty, getSubProperty);
        }
    }, finạlly);
};

BusinessObjectMapping.prototype.map = function (leftObject, rightObject, rtl, superProperty, getProperty) {

    var self = this;
    if (leftObject) self.forEachAttribute(rightObject, superProperty, getProperty, function (property, mappedProperty) {

        if (typeof mappedProperty !== 'string' && typeof mappedProperty !== 'function') throw new Error('Invalid property name');
        if (rtl) {

            if (typeof mappedProperty === 'function') mappedProperty(leftObject, rightObject[property]);
            else leftObject[mappedProperty] = rightObject[property];
        } else {

            if (typeof mappedProperty === 'function') rightObject[property] = mappedProperty(leftObject);
            rightObject[property] = leftObject[mappedProperty];
        }
    });
};

BusinessObjectMapping.prototype.deepMap = function (leftObject, rightObject, superProperty, getProperty) {

    var self = this;
    if (leftObject) self.forEachRelation(rightObject, superProperty, getProperty, function (property, mappedProperty) {

        if (typeof mappedProperty === 'function') {

            mappedProperty(leftObject, rightObject[property]);
        }
    });
};

module.exports.BusinessObjectMapping = BusinessObjectMapping;
