/*jslint node: true */
/*jshint esversion: 6 */
"use strict";

var define = require("define-js");
var parse = require("parseparams");
var {
    ServiceAdapter,
    ServiceEndPoint,
    ServiceAuthenticator,
    ServiceObjectMetadata,
    ServiceParameter,
    ServiceParameterType
} = require("behaviours-js");

module.exports = {

    ServiceParameter,
    ServiceParameterType
};

module.exports.service = function () {

    return function () {

        var [
            baseURI,
            serve,
            authenticate,
            isAuthenticated
        ] = arguments;
        if (typeof serve !== "function") {

            throw new Error("Invalid" +
                " service function");
        }
        if (parse(serve).length < 2) {

            throw new Error("Invalid" +
                " service function");
        }
        let _ = typeof authenticate;
        var invalid = _ === "function";
        if (invalid) {

            invalid &= parse(...[
                authenticate
            ]).length < 2;
        }
        if (invalid) {

            throw new Error("Invalid " +
                "authentication function");
        }
        var Authenticator = null;
        if (_ === "function") {

            Authenticator = define(...[
                function (init) {

                    return function () {

                        var self = init.apply(...[
                            this,
                            arguments
                        ]).self();
                        self[
                            "authenticate"
                        ] = authenticate;
                    };
                }
            ]).extend(...[
                ServiceAuthenticator
            ]).defaults();
        }
        var Adapter = define(function (init) {

            return function (base, constants) {

                var self = init.apply(...[
                    this,
                    arguments
                ]).self();
                var authenticator = null;
                _ = typeof Authenticator;
                if (_ === "function") {

                    _ = new Authenticator();
                    authenticator = _;
                }
                var send = function () {

                    let [
                        request,
                        callback
                    ] = arguments;
                    switch (request) {

                        case "authentication":
                            if (!authenticator) {

                                throw new Error(...[
                                    "Missing " +
                                    "authentication" +
                                    " function"
                                ]);
                            }
                            authenticator.authenticate(...[
                                request,
                                callback
                            ]);
                            break;
                        case "request":
                            serve(request, callback);
                            break;
                    }
                };
                self.sendRequest = function () {

                    let [
                        request,
                        callback
                    ] = arguments;
                    request.baseURI = baseURI;
                    request.constants = constants || {};
                    var serializedRequest = request;
                    _ = typeof request.context;
                    var serializing = _ === "object";
                    let serialize;
                    if (serializing) {

                        ({ serialize } = request.context);
                        _ = typeof serialize;
                        serializing &= _ === "function";
                    }
                    if (serializing) {

                        serializedRequest = serialize(...[
                            request
                        ]);
                    }
                    var deserializeCallback = callback;
                    _ = typeof request.context;
                    var deserializing = _ === "object";
                    let deserialize;
                    if (deserializing) {

                        ({ deserialize } = request.context);
                        _ = typeof deserialize;
                        deserializing &= _ === "function";
                    }
                    if (deserializing) {

                        deserializeCallback = function () {

                            let [
                                response,
                                error
                            ] = arguments;
                            callback(...[
                                deserialize(response),
                                error
                            ]);
                        };
                    }
                    if (isAuthenticated === "function") {

                        isAuthenticated(...[
                            serializedRequest,
                            function (success, error) {

                                if (success && !error) {

                                    send(...[
                                        serializedRequest,
                                        deserializeCallback
                                    ]);
                                } else callback(...[
                                    null,
                                    error || new Error(...[
                                        "Authentication " +
                                        "needed"
                                    ])
                                ]);
                            }
                        ]);
                    } else {

                        let { context } = request;
                        _ = typeof context;
                        var authenticating = _ === "object";
                        if (authenticating) {

                            _ = typeof context.authenticate;
                            authenticating &= _ === "function";
                        }
                        if (authenticating) {

                            context.authenticate(...[
                                serializedRequest,
                                function (req) {

                                    send(...[
                                        req,
                                        deserializeCallback
                                    ]);
                                }
                            ]);
                        } else send(...[
                            serializedRequest,
                            deserializeCallback
                        ]);
                    }
                };
            };
        }).extend(ServiceAdapter).defaults(baseURI);
        return function (path, options) {

            if (typeof path === "object") {

                options = path;
            }
            if (!options) options = {};
            var EndPoint = define(function () {

                let [init, sṵper] = arguments;
                return function () {

                    let [
                        context,
                        constants,
                        mappings
                    ] = arguments;
                    var getMetadata = function () {

                        let [
                            mapping,
                            modelAttrs,
                            serviceAttrs
                        ] = arguments;
                        var map = mapping;
                        var name = "";
                        var model = "";
                        var key;
                        var value;
                        var id;
                        var storeId;
                        var getMap = function () {

                            let [
                                __map,
                                __key
                            ] = arguments;
                            var _map = {};
                            if (typeof __map !== "string") {

                                name = __key;
                            }
                            if (typeof __map === "object") {

                                return __map;
                            }
                            if (Array.isArray(__map)) {

                                _ = typeof __map[0];
                                if (_ === "string") {

                                    model = __map[0];
                                } else {

                                    throw new Error("Invalid " +
                                        "nested mapping");
                                }
                                _ = typeof __map[1];
                                if (_ === "object") {

                                    return __map[1];
                                } else if (_ === "function") {

                                    name = "";
                                    model = "";
                                    _map[__key] = __map;
                                    return _map;
                                } else {

                                    _ = typeof __map[0];
                                    let __ = typeof __map[1];
                                    var strings = _ === "string";
                                    strings &= __ === "string";
                                    if (strings) {

                                        model = "";
                                        _map[__map[0]] = __map[1];
                                        return _map;
                                    } else {

                                        throw new Error("Invalid" +
                                            " nested mapping");
                                    }
                                }
                            }
                        };
                        var one = typeof mapping === "object";
                        if (one) {

                            one &= Object.keys(...[
                                mapping
                            ]).length === 1;
                        }
                        if (one) map = getMap(...[
                            mapping[Object.keys(mapping)[0]],
                            Object.keys(mapping)[0]
                        ]) || map; else {

                            let many = Array.isArray(mapping);
                            if (many) {

                                many &= mapping.length > 1;
                            }
                            if (many) {

                                map = getMap(...[
                                    mapping[1],
                                    mapping[0]
                                ]) || map;
                                if (Array.isArray(mapping[1])) {

                                    if (mapping[1].length > 0) {

                                        key = mapping[1][0];
                                    }
                                    if (mapping[1].length > 1) {

                                        value = mapping[1][1];
                                    }
                                    if (mapping[1].length > 2) {

                                        id = mapping[1][2];
                                    }
                                    if (mapping[1].length > 3) {

                                        storeId = mapping[1][3];
                                    }
                                }
                            } else {

                                _ = typeof mapping;
                                if (mapping && _ !== "object") {

                                    throw new Error("Invalid" +
                                        " mapping");
                                }
                            }
                        }
                        var modelAttributes = modelAttrs;
                        if (typeof map === "object") {

                            modelAttributes = Object.values(...[
                                map
                            ]).map(function (attribute) {

                                _ = typeof attribute;
                                if (_ === "string") {

                                    return attribute;
                                }
                                let many = Array.isArray(...[
                                    attribute
                                ]);
                                if (many) {

                                    _ = typeof attribute[0];
                                    many &= _ === "string";
                                }
                                if (many) return attribute[0];
                                throw new Error("Invalid" +
                                    " mapping");
                            });
                        }
                        var serviceAttributes = serviceAttrs;
                        if (typeof map === "object") {

                            serviceAttributes = Object.keys(map);
                        }
                        var metadata = new ServiceObjectMetadata({

                            model,
                            name,
                            attributesKeyName: key,
                            attributesValueName: value,
                            id,
                            storeID: storeId,
                            modelAttributes,
                            serviceAttributes
                        });
                        if (metadata.attributes) {

                            let length = modelAttributes.length;
                            let {
                                attributes
                            } = metadata;
                            for (var i = 0; i < length; i++) {

                                var attribute = attributes[i];
                                var _attr_ = modelAttributes[i];
                                if (Array.isArray(_attr_)) {

                                    _ = typeof _attr_[1];
                                    if (_ === "object") {

                                        attribute[
                                            "metadata"
                                        ] = getMetadata(...[
                                            _attr_[1]
                                        ]);
                                    }
                                    if (_ === "function") {

                                        attribute[
                                            "getValue"
                                        ] = _attr_[1];
                                    }
                                }
                            }
                        }
                        return metadata;
                    };
                    var self = init.apply(this, [{

                        responseMetadata: getMetadata(...[
                            mappings,
                            options.model,
                            options.service
                        ]),
                        baseURI,
                        Adapter
                    }]).self();
                    self.path = path;
                    self.context = context || {};
                    self.context[
                        "serialize"
                    ] = self.context.serialize;
                    if (!self.context.serialize) {

                        self.context[
                            "serialize"
                        ] = options.serialize;
                    }
                    self.context[
                        "deserialize"
                    ] = self.context.deserialize;
                    if (!self.context.deserialize) {

                        self.context[
                            "deserialize"
                        ] = options.deserialize;
                    }
                    self.context[
                        "authenticate"
                    ] = self.context.authenticate;
                    if (!self.context.authenticate) {

                        self.context[
                            "authenticate"
                        ] = options.authenticate;
                    }
                    self.adapter = function () {

                        return sṵper.adapter(constants);
                    };
                };
            }).extend(ServiceEndPoint).defaults({

                baseURI,
                Adapter,
                responseMetadata: options.response,
                modelAttributes: options.model,
                serviceAttributes: options.service
            });
            return EndPoint;
        };
    };
};
