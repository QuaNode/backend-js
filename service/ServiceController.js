/*jslint node: true */
'use strict';

var ServiceEndPoint = require('./ServiceEndPoint.js').ServiceEndPoint;
var ServiceParameter = require('./ServiceParameter.js').ServiceParameter;
var ServiceParameterType = require('./ServiceParameter.js').ServiceParameterType;
var ServiceObjectMapping = require('./ServiceObjectMapping.js').ServiceObjectMapping;

var encodeServiceParameters = function (serviceParameters, request) {

    request.method = 'GET';
    for (var i = 0, q = 0; i < serviceParameters.length; i++) {

        var type = serviceParameters[i].type();
        switch (type) {

            case ServiceParameterType.BODY:
                if (!request.body) request.body = {};
                request.body[serviceParameters[i].key()] = serviceParameters[i].value();
                break;
            case ServiceParameterType.HEADER:
                if (!request.headers) request.headers = {};
                request.headers[serviceParameters[i].key()] = serviceParameters[i].value();
                break;
            case ServiceParameterType.METHOD:
                request.method = serviceParameters[i].value();
                break;
            case ServiceParameterType.URIQUERY:
                request.path += (q++ > 0 ? '&' : '?') + serviceParameters[i].key() + '=' + encodeURIComponent(serviceParameters[i].value());
                break;
            case ServiceParameterType.URIPARAMETER:
                request.path = request.path.replace(':' + serviceParameters[i].key(), encodeURIComponent(serviceParameters[i].value()));
                break;
            default:
                throw new Error('Invalid service paramater');
        }
    }
};

var getQueryByIDCallback = function (index, serviceObjects, objectMetadata, callback, options, serviceObjectMapping,
    modelEntity) {

    var getObjectsByID = options.getObjectsByID;
    var newObjects = options.newObjects;
    var save = options.save;
    var objectAttributesMethod = options.objectAttributesMethod;
    return function (mObjects, error) {

        serviceObjectMapping.mapServiceObject(serviceObjects[index], objectMetadata, modelEntity &&
            modelEntity[objectAttributesMethod](), Array.isArray(mObjects) ? mObjects : [],
            function (mObject, op) {

                var next = function () {

                    if (modelEntity && (index % 1000 === 0 || index === serviceObjects.length - 1)) {

                        if (typeof save === 'function') save(function () {

                            if (index + 1 < serviceObjects.length) queryByID(index + 1, serviceObjects, objectMetadata,
                                callback, options, serviceObjectMapping, modelEntity);
                            else callback();
                        });
                        else throw new Error('Invalid save function');
                    } else if (index + 1 < serviceObjects.length) queryByID(index + 1, serviceObjects, objectMetadata,
                        callback, options, serviceObjectMapping, modelEntity);
                    else callback();
                };
                if (modelEntity && op === 'insert') {

                    if (typeof newObjects === 'function') newObjects([mObject], modelEntity, function () {

                        next();
                    });
                    else throw new Error('Invalid new objects function');
                } else next();
            });
    };
};

var queryByID = function (index, serviceObjects, objectMetadata, callback, options, serviceObjectMapping, modelEntity) {

    var getObjectsByID = options.getObjectsByID;
    var objectAttributesMethod = options.objectAttributesMethod;
    setTimeout(function () {

        var serviceObject = serviceObjects[index];
        var idServiceValue = serviceObjectMapping.getIDServiceValue(serviceObject, objectMetadata, modelEntity &&
            modelEntity[objectAttributesMethod]());
        if (idServiceValue) {

            if (typeof getObjectsByID === 'function')
                getObjectsByID(objectMetadata.id, idServiceValue, modelEntity,
                    getQueryByIDCallback(index, serviceObjects, objectMetadata, callback, options, serviceObjectMapping,
                        modelEntity));
            else getQueryByIDCallback(index, serviceObjects, objectMetadata, callback, options, serviceObjectMapping,
                modelEntity)();
        } else getQueryByIDCallback(index, serviceObjects, objectMetadata, callback, options, serviceObjectMapping,
            modelEntity)();
    }, 0);
};

var mapAndSync = function (serviceObjects, objectMetadata, callback, options) {

    var serviceObjectMapping = new ServiceObjectMapping();
    var createModelEntity = options.createModelEntity;
    var objectAttributesMethod = options.objectAttributesMethod;
    if (serviceObjects && objectMetadata && objectMetadata.model && Array.isArray(objectMetadata.attributes)) {

        var modelEntity = objectMetadata.model.length > 0 && typeof createModelEntity === 'function' ?
            createModelEntity(objectMetadata.model) : null;
        if (objectMetadata.model.length > 0) {

            if (typeof createModelEntity !== 'function') throw new Error('Invalid create entity function');
            else if (!modelEntity) throw new Error('Invalid entity name');
            else if (typeof objectAttributesMethod !== 'string' || !modelEntity[objectAttributesMethod])
                throw new Error('Invalid object attributes method name');
        }
        if (!Array.isArray(serviceObjects)) serviceObjects = [serviceObjects];
        queryByID(0, serviceObjects, objectMetadata, callback, options, serviceObjectMapping, modelEntity);
    } else callback();
};

var reflectOnModel = function (response, objectMetadata, callback, options) {

    var serviceObjects = null;
    if (Array.isArray(response)) {

        serviceObjects = response;
    } else if (typeof response === 'object' && objectMetadata && typeof objectMetadata.name === 'string') {

        if (objectMetadata.name.length === 0) serviceObjects = [response];
        else {

            var serviceObjectPathComponents = objectMetadata.name.split('.');
            var deepResponse = response;
            for (var i = 0; i < serviceObjectPathComponents.length && deepResponse; i++) {

                deepResponse = deepResponse[serviceObjectPathComponents[i]];
            }
            if (deepResponse) serviceObjects = deepResponse;
        }
    }
    mapAndSync(serviceObjects, objectMetadata, function () {

        callback(serviceObjects);
    }, options);
};

var createRequest = function (servicePrameters, serviceEndPoint, type, callback, serviceAdapter, options) {

    if (!Array.isArray(servicePrameters) || servicePrameters.some(function (servicePrameter) {

        return !(servicePrameter instanceof ServiceParameter);
    }))
        throw new Error('Invalid service paramaters');
    if (!(serviceEndPoint instanceof ServiceEndPoint)) throw new Error('Invalid service endpoint');
    var request = {

        type: type,
        path: serviceEndPoint.path,
        context: serviceEndPoint.context
    };
    encodeServiceParameters(servicePrameters, request);
    if (!serviceEndPoint.consumableByAdapter(serviceAdapter)) {

        serviceAdapter = serviceEndPoint.adapter();
    }
    serviceAdapter.sendRequest(request, function (response, error) {

        reflectOnModel(response, serviceEndPoint.responseMetadata, function (serviceObjects) {

            if (typeof callback === 'function') callback(serviceObjects || response, error);
        }, options);
    });
    return serviceAdapter;
};

module.exports.ServiceController = function (options) {

    var self = this;
    var serviceAdapter = null;
    self.authenticate = function (servicePrameters, serviceEndPoint, callback) {

        serviceAdapter = createRequest(servicePrameters, serviceEndPoint, 'authentication', callback, serviceAdapter, options);
    };
    self.request = function (servicePrameters, serviceEndPoint, callback) {

        serviceAdapter = createRequest(servicePrameters, serviceEndPoint, 'request', callback, serviceAdapter, options);
    };
};
