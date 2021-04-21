/*jslint node: true */
/*jshint esversion: 6 */
'use strict';

var define = require('define-js');
var parse = require('parseparams');
var {
    ServiceAdapter,
    ServiceEndPoint,
    ServiceAuthenticator,
    ServiceObjectMetadata,
    ServiceParameter,
    ServiceParameterType
} = require('behaviours-js');

module.exports.ServiceParameter = ServiceParameter;
module.exports.ServiceParameterType = ServiceParameterType;

module.exports.service = function () {

    return function (baseURI, serve, authenticate, authenticated) {

        if (typeof serve !== 'function') {

            throw new Error('Invalid service function');
        }
        if (typeof parse(serve).length < 2) {

            throw new Error('Invalid service function');
        }
        if (typeof authenticate === 'function' && typeof parse(authenticate).length < 2) {

            throw new Error('Invalid authentication function');
        }
        var Authenticator = null;
        if (typeof authenticate === 'function') {

            Authenticator = define(function (init) {

                return function () {

                    var self = init.apply(this, arguments).self();
                    self.authenticate = authenticate;
                };
            }).extend(ServiceAuthenticator).defaults();
        }
        var Adapter = define(function (init) {

            return function (base, constants) {

                var self = init.apply(this, arguments).self();
                var authenticator = null;
                if (typeof Authenticator === 'function') authenticator = new Authenticator();
                var send = function (request, callback) {

                    switch (request) {

                        case 'authentication':
                            if (!authenticator) throw new Error('Missing authentication function');
                            authenticator.authenticate(request, callback);
                            break;
                        case 'request':
                            serve(request, callback);
                            break;
                    }
                };
                self.sendRequest = function (request, callback) {

                    request.baseURI = baseURI;
                    request.constants = constants || {};
                    var serializedRequest = request;
                    if (typeof request.context === 'object' &&
                        typeof request.context.serialize === 'function') {

                        serializedRequest = request.context.serialize(request);
                    }
                    var deserializeCallback = callback;
                    if (typeof request.context === 'object' &&
                        typeof request.context.deserialize === 'function') {

                        deserializeCallback = function (response, error) {

                            callback(request.context.deserialize(response), error);
                        };
                    }
                    if (authenticated === 'function') {

                        authenticated(serializedRequest, function (success, error) {

                            if (success && !error) send(serializedRequest, deserializeCallback);
                            else callback(null, error || new Error('Authentication needed'));
                        });
                    } else {

                        if (typeof request.context === 'object' &&
                            typeof request.context.authenticate === 'function')
                            request.context.authenticate(serializedRequest, function (req) {

                                send(req, deserializeCallback);
                            });
                        else send(serializedRequest, deserializeCallback);
                    }
                };
            };
        }).extend(ServiceAdapter).defaults(baseURI);
        return function (path, opt) {

            var options = typeof path === 'object' ? path : opt || {};
            var EndPoint = define(function (init, sṵper) {

                return function (context, constants, mappings) {

                    var getMetadata = function (mapping, modelAttrs, serviceAttrs) {

                        var map = mapping;
                        var name = '';
                        var model = '';
                        var key;
                        var value;
                        var id;
                        var storeId;
                        var getMap = function (__map, __key) {

                            var _map = {};
                            if (typeof __map !== 'string') name = __key;
                            if (typeof __map === 'object') return __map;
                            if (Array.isArray(__map)) {

                                if (typeof __map[0] === 'string') model = __map[0];
                                else throw new Error('Invalid nested mapping');
                                if (typeof __map[1] === 'object') return __map[1];
                                else if (typeof __map[1] === 'function') {

                                    name = '';
                                    model = '';
                                    _map[__key] = __map;
                                    return _map;
                                } else if (typeof __map[0] === 'string' &&
                                    typeof __map[1] === 'string') {

                                    model = '';
                                    _map[__map[0]] = __map[1];
                                    return _map;
                                } else throw new Error('Invalid nested mapping');
                            }
                        };
                        if (typeof mapping === 'object' && Object.keys(mapping).length === 1)
                            map = getMap(mapping[Object.keys(mapping)[0]],
                                Object.keys(mapping)[0]) || map;
                        else if (Array.isArray(mapping) && mapping.length > 1) {

                            map = getMap(mapping[1], mapping[0]) || map;
                            if (Array.isArray(mapping[1])) {

                                key = mapping[1].length > 0 ? mapping[1][0] : key;
                                value = mapping[1].length > 1 ? mapping[1][1] : value;
                                id = mapping[1].length > 2 ? mapping[1][2] : id;
                                storeId = mapping[1].length > 3 ? mapping[1][3] : value;
                            }
                        } else if (mapping && typeof mapping !== 'object')
                            throw new Error('Invalid mapping');
                        var modelAttributes = (typeof map === 'object' ?
                            Object.values(map) : []).map(function (attribute) {

                                if (typeof attribute === 'string') return attribute;
                                if (Array.isArray(attribute) && typeof attribute[0] === 'string')
                                    return attribute[0];
                                throw new Error('Invalid mapping');
                            }) || modelAttrs;
                        var metadata = new ServiceObjectMetadata({

                            model: model,
                            name: name,
                            attributesKeyName: key,
                            attributesValueName: value,
                            id: id,
                            storeID: storeId,
                            modelAttributes: modelAttributes,
                            serviceAttributes:
                                (typeof map === 'object' && Object.keys(map)) || serviceAttrs
                        });
                        for (var i = 0; metadata.attributes && i < modelAttributes.length; i++) {

                            var attribute = metadata.attributes[i];
                            if (Array.isArray(modelAttributes[i])) {

                                if (typeof modelAttributes[i][1] === 'object')
                                    attribute.metadata = getMetadata(modelAttributes[i][1]);
                                if (typeof modelAttributes[i][1] === 'function')
                                    attribute.getValue = modelAttributes[i][1];
                            }
                        }
                        return metadata;
                    };
                    var self = init.apply(this, [{

                        responseMetadata: getMetadata(mappings, options.model, options.service),
                        baseURI: baseURI,
                        Adapter: Adapter
                    }]).self();
                    self.path = path;
                    self.context = context || {};
                    self.context.serialize = self.context.serialize || options.serialize;
                    self.context.deserialize = self.context.deserialize || options.deserialize;
                    self.context.authenticate = self.context.authenticate || options.authenticate;
                    self.adapter = function () {

                        return sṵper.adapter(constants);
                    };
                };
            }).extend(ServiceEndPoint).defaults({

                baseURI: baseURI,
                Adapter: Adapter,
                responseMetadata: options.response,
                modelAttributes: options.model,
                serviceAttributes: options.service
            });
            return EndPoint;
        };
    };
};
