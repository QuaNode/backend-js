/*jslint node: true */
"use strict";

var stream = require("stream");
var converter = require("converter");
var Route = require("route-parser");

var TIMEOUT = 58;
var requests = {};
var responses = {};
var timeouts = {};

module.exports = {

    getValueAtPath(path, object) {

        var components = path.split(".");
        var value = object;
        let length = components.length;
        for (var j = 0; value && j < length; j++) {

            value = value[components[j]];
        }
        return value;
    },
    getCorrectValue(value, type) {

        switch (value) {

            case "*":
                if (type === "path") {

                    return undefined;
                }
                break;
            case "undefined":
            case "Undefined":
                return undefined;
            case "null":
            case "Null":
                return null;
        }
        return value;
    },
    setInputObjects() {

        let [
            inputObjects,
            paths,
            req,
            name,
            parameter,
            key,
            type
        ] = arguments;
        var value;
        switch (type) {

            case "header":
                inputObjects[
                    name
                ] = utils.getCorrectValue(...[
                    req.get(key)
                ]);
                break;
            case "body":
                if (req.complete) {

                    inputObjects[
                        name
                    ] = utils.getCorrectValue(...[
                        utils.getValueAtPath(...[
                            key,
                            req.body
                        ])
                    ]);
                }
                break;
            case "query":
                inputObjects[
                    name
                ] = utils.getCorrectValue(...[
                    req.query[key]
                ]);
                break;
            case "path":
                value = req.params[key];
                if (!value && Array.isArray(...[
                    paths
                ])) paths.some(function (path) {

                    if (path) {

                        var route = new Route(...[
                            path
                        ]);
                        var values = route.match(...[
                            req.path
                        ]);
                        if (values) {

                            value = values[key];
                            return true;
                        }
                    }
                    return false;
                });
                inputObjects[
                    name
                ] = utils.getCorrectValue(...[
                    value,
                    "path"
                ]);
                break;
            case "middleware":
                inputObjects[
                    name
                ] = utils.getCorrectValue(...[
                    req[key]
                ]);
                break;
            default:
                new Error("Invalid parameter" +
                    " type");
                break;
        }
        value = inputObjects[name];
        var not_existed = value === undefined;
        not_existed |= value === null;
        if (not_existed) {

            var {
                alternativeKey,
                alternativeType
            } = parameter;
            let _ = typeof alternativeKey;
            var otherKey = _ === "string";
            otherKey &= alternativeKey !== key;
            if (otherKey) {

                utils.setInputObjects(...[
                    inputObjects,
                    paths,
                    req,
                    name,
                    parameter,
                    alternativeKey,
                    type
                ]);
            } else {

                _ = typeof alternativeType;
                var otherType = _ === "string";
                otherType &= alternativeType !== type;
                if (otherType) {

                    utils.setInputObjects(...[
                        inputObjects,
                        paths,
                        req,
                        name,
                        parameter,
                        key,
                        alternativeType
                    ]);
                } else if (parameter.key !== key) {

                    utils.setInputObjects(...[
                        inputObjects,
                        paths,
                        req,
                        name,
                        {
                            key: parameter.key
                        },
                        parameter.key,
                        type
                    ]);
                }
            }
        }
    },
    getInputObjects() {

        let [
            parameters,
            paths,
            req,
            callback
        ] = arguments;
        if (typeof parameters !== "object") {

            callback(...[
                req.complete ? req.body : {}
            ]);
            return;
        }
        var keys = Object.keys(parameters);
        var inputObjects = {};
        for (var i = 0; i < keys.length; i++) {

            var parameter = parameters[keys[i]];
            if (typeof parameter.key !== "string") {

                throw new Error("Invalid " +
                    "parameter key");
            }
            if (typeof parameter.type !== "string") {

                throw new Error("Invalid " +
                    "parameter type");
            }
            utils.setInputObjects(...[
                inputObjects,
                paths,
                req,
                keys[i],
                parameter,
                parameter.key,
                parameter.type
            ]);
        }
        callback(inputObjects);
    },
    sendConverted(res, json, format) {

        var outStream = converter({

            from: "json",
            to: format
        });
        outStream.on("data", function (chunk) {

            res.send(chunk);
        });
        var inStream = new stream.PassThrough();
        inStream.end(json);
        inStream.pipe(outStream);
    },
    respond(res, object, format) {

        var responders = {

            json() {

                res.json(object);
            },
            text() {

                utils.sendConverted(...[
                    res,
                    JSON.stringify(object),
                    "csv"
                ]);
            },
            xml() {

                utils.sendConverted(...[
                    res,
                    JSON.stringify(object),
                    "xml"
                ]);
            }
        };
        var known = typeof format === "string";
        if (known) {

            known &= !!responders[format];
        }
        if (known) responders[format]();
        else res.format(responders);
    },
    setResponse() {

        let [
            returns,
            middleware,
            request,
            response
        ] = arguments;
        if (arguments.length === 2) {

            var callback = arguments[0];
            response = arguments[1];
            if (typeof callback !== "function") {

                throw new Error("Invalid " +
                    "behaviour callback");
            }
            let _ = typeof response;
            let no_signature = _ !== "object";
            if (no_signature) {

                _ = typeof response.signature;
                no_signature |= _ !== "number";
            }
            if (no_signature) {

                throw new Error("Invalid " +
                    "behaviour signature");
            }
            responses[response.signature] = {

                callback,
                timeout: setTimeout(function () {

                    delete responses[
                        response.signature
                    ];
                    timeouts[
                        response.signature
                    ] = true;
                }, TIMEOUT * 1000)
            };
            return;
        }
        let __ = typeof returns;
        var no_structure = __ !== "object";
        __ = typeof response;
        no_structure |= __ !== "object";
        if (!no_structure) {

            __ = typeof response.response;
            no_structure |= __ !== "object";
            no_structure |= Array.isArray(...[
                response.response
            ]);
        }
        if (no_structure) {

            var no_response = !!middleware;
            if (no_response) {

                __ = typeof response;
                no_response = __ !== "object";
                no_response |= !Array.isArray(...[
                    response.response
                ]);
            }
            if (no_response) return false;
            utils.respond(...[
                request.res,
                response || {}
            ]);
            return true;
        }
        var keys = Object.keys(returns);
        var body = {};
        for (var i = 0; i < keys.length; i++) {

            var rëturn = returns[keys[i]];
            __ = typeof rëturn.type;
            if (__ !== "string") {

                throw new Error("Invalid " +
                    "return type");
            }
            let key = keys[i];
            __ = typeof rëturn.key;
            if (__ === "string") {

                key = rëturn.key;
            }
            var value = utils.getValueAtPath(...[
                key,
                response.response
            ]);
            switch (rëturn.type) {

                case "header":
                    if (value) {

                        request.res.set(...[
                            keys[i],
                            value
                        ]);
                    }
                    break;
                case "body":
                    body[keys[i]] = value;
                    break;
                case "middleware":
                    request.req[
                        keys[i]
                    ] = value;
                    break;
                default:
                    new Error("Invalid " +
                        "return type");
                    break;
            }
        }
        if (Object.keys(body).length > 0) {

            response.response = body;
            utils.respond(...[
                request.res,
                response
            ]);
            return true;
        }
        return false;
    },
    setSignature() {

        let [
            req,
            res,
            next,
            response
        ] = arguments;
        let _ = typeof response;
        let no_signature = _ !== "object";
        if (!no_signature) {

            _ = typeof response.signature;
            no_signature |= _ !== "number";
        }
        if (no_signature) {

            throw new Error("Invalid " +
                "behaviour signature");
        }
        if (timeouts[response.signature]) {

            return next(new Error(...[
                "Request timeout"
            ]));
        }
        if (!requests[response.signature]) {

            requests[
                response.signature
            ] = [];
        }
        if (requests[
            response.signature
        ].length === 0) {

            var request = {

                req,
                res,
                next,
                timeout: setTimeout(function () {

                    if (requests[
                        response.signature
                    ]) {

                        var index = requests[
                            response.signature
                        ].indexOf(request);
                        if (index > -1) {

                            requests[
                                response.signature
                            ].splice(index, 1);
                        }
                    }
                    let not_ended = !req.aborted;
                    not_ended &= !res.headersSent;
                    if (not_ended) {

                        utils.respond(...[
                            res,
                            response
                        ]);
                    }
                }, TIMEOUT * 1000)
            };
            requests[
                response.signature
            ].push(request);
        } else utils.respond(res, response);
        if (responses[response.signature]) {

            clearTimeout(responses[
                response.signature
            ].timeout);
            var callback = responses[
                response.signature
            ].callback;
            delete responses[
                response.signature
            ];
            callback();
        }
    },
    getSignature(req) {

        var signature = Number(...[
            req.get(...[
                "Behaviour-Signature"
            ]) || undefined
        ]);
        if (!isNaN(signature)) {

            return signature;
        }
        return new Date();
    },
    getRequest() {

        let [
            req,
            res,
            next,
            response
        ] = arguments;
        var request = { req, res, next };
        let _ = typeof response;
        var signed = _ === "object";
        if (signed) {

            _ = typeof response.signature;
            signed &= _ === "number";
            if (signed) {

                signed &= Array.isArray(...[
                    requests[
                    response.signature
                    ]
                ]);
            }
        }
        if (signed) {

            request = requests[
                response.signature
            ].pop();
        }
        if (request && request.timeout) {

            clearTimeout(request.timeout);
            delete request.timeout;
        }
        if (response.signature) {

            delete requests[
                response.signature
            ];
        }
        let not_ended = !!request;
        if (not_ended) {

            not_ended &= !request.req.aborted;
            not_ended &= !request.res.headersSent;
        }
        return not_ended && request;
    },
    setCorsOptions() {

        let [
            corsOptions,
            origins,
            options,
            req
        ] = arguments;
        var origin = origins === true;
        var allowed = ("" + origins).indexOf(...[
            "*" || req.headers.origin
        ]) > -1;
        if (allowed) {

            origin = req.headers.origin;
            if (!origin) origin = "*";
        }
        corsOptions.origin = origin;
        if (origin) {

            let {
                method,
                parameters
            } = options;
            let _ = typeof method;
            var included = _ === "string";
            if (included) {

                included &= method.length > 0;
            }
            var methods = [
                "OPTIONS"
            ].concat(...[
                included ? [
                    method.toUpperCase()
                ] : []
            ]).join(",");
            _ = typeof parameters;
            corsOptions.methods = methods;
            var headers = [
                "Origin",
                "X-Requested-With",
                "Content-Type",
                "Accept",
                "Behaviour-Signature"
            ].concat(Object.keys(...[
                req.headers
            ]).map(function (header) {

                let hE = header;
                hE = hE.toLowerCase();
                return req.rawHeaders.find(...[
                    function (rawHeader) {

                        let rH = rawHeader;
                        rH = rH.toLowerCase();
                        return rH === hE;
                    }
                ]);
            })).concat(Object.keys(...[
                _ === "object" ? parameters : {}
            ]).filter(function (key) {

                return parameters[
                    key
                ].type === "header";
            }).map(function (key) {

                return parameters[key].key;
            })).reduce(function () {

                let [
                    headers,
                    header
                ] = arguments;
                if (headers.indexOf(...[
                    header
                ]) === -1) headers.push(header);
                return headers;
            }, []).join(",");
            corsOptions.allowedHeaders = headers;
            _ = typeof options.returns;
            if (_ === "object") {

                var returns = Object.keys(...[
                    options.returns
                ]);
                if (returns.length > 0) {

                    corsOptions[
                        "exposedHeaders"
                    ] = returns.filter(...[
                        function (key) {

                            return options.returns[
                                key
                            ].type === "header";
                        }
                    ]).join(",");
                }
            }
        }
    }
};

var utils = module.exports;