/*jslint node: true */
'use strict';

var stream = require('stream');
var converter = require('converter');
var Route = require('route-parser');

var TIMEOUT = 58;
var requests = {};
var responses = {};
var timeouts = {};

module.exports = {

    getValueAtPath: function (path, object) {

        var components = path.split('.');
        var value = object;
        for (var j = 0; value && j < components.length; j++)
            value = value[components[j]];
        return value;
    },
    getCorrectValue: function (value, type) {

        switch (value) {

            case '*':
                if (type === 'path') return undefined;
                break;
            case 'undefined':
            case 'Undefined':
                return undefined;
            case 'null':
            case 'Null':
                return null;
        }
        return value;
    },
    setInputObjects: function (inputObjects, paths, req, name, parameter, key, type) {

        switch (type) {

            case 'header':
                inputObjects[name] = utils.getCorrectValue(req.get(key));
                break;
            case 'body':
                if (req.complete) inputObjects[name] =
                    utils.getCorrectValue(utils.getValueAtPath(key, req.body));
                break;
            case 'query':
                inputObjects[name] = utils.getCorrectValue(req.query[key]);
                break;
            case 'path':
                var value = req.params[key];
                if (!value && Array.isArray(paths)) paths.some(function (path) {

                    if (path) {

                        var route = new Route(path);
                        var values = route.match(req.path);
                        if (values) {

                            value = values[key];
                            return true;
                        }
                    }
                    return false;
                });
                inputObjects[name] = utils.getCorrectValue(value, 'path');
                break;
            case 'middleware':
                inputObjects[name] = utils.getCorrectValue(req[key]);
                break;
            default:
                new Error('Invalid parameter type');
                break;
        }
        if (inputObjects[name] === undefined || inputObjects[name] === null) {

            if (typeof parameter.alternativeKey === 'string' &&
                parameter.alternativeKey !== key) utils.setInputObjects(inputObjects,
                    paths, req, name, parameter, parameter.alternativeKey, type);
            else if (typeof parameter.alternativeType === 'string' &&
                parameter.alternativeType !== type) utils.setInputObjects(inputObjects,
                    paths, req, name, parameter, key, parameter.alternativeType);
            else if (parameter.key !== key) utils.setInputObjects(inputObjects, paths, req, name, {

                key: parameter.key
            }, parameter.key, type);
        }
    },
    getInputObjects: function (parameters, paths, req, callback) {

        if (typeof parameters !== 'object') {

            callback(req.complete ? req.body : {});
            return;
        }
        var keys = Object.keys(parameters);
        var inputObjects = {};
        for (var i = 0; i < keys.length; i++) {

            if (typeof parameters[keys[i]].key !== 'string') {

                throw new Error('Invalid parameter key');
            }
            if (typeof parameters[keys[i]].type !== 'string') {

                throw new Error('Invalid parameter type');
            }
            var parameter = parameters[keys[i]];
            utils.setInputObjects(inputObjects, paths, req, keys[i],
                parameter, parameter.key, parameter.type);
        }
        callback(inputObjects);
    },
    sendConverted: function (res, json, format) {

        var outStream = converter({

            from: 'json',
            to: format
        });
        outStream.on('data', function (chunk) {

            res.send(chunk);
        });
        var inStream = new stream.PassThrough();
        inStream.end(json);
        inStream.pipe(outStream);
    },
    respond: function (res, object, format) {

        var responders = {

            json: function () {

                res.json(object);
            },
            text: function () {

                utils.sendConverted(res, JSON.stringify(object), 'csv');
            },
            xml: function () {

                utils.sendConverted(res, JSON.stringify(object), 'xml');
            }
        };
        if (typeof format === 'string' && responders[format]) responders[format]();
        else res.format(responders);
    },
    setResponse: function (returns, middleware, request, response) {

        if (arguments.length === 2) {

            var callback = arguments[0];
            response = arguments[1];
            if (typeof callback !== 'function') throw new Error('Invalid behaviour callback');
            if (typeof response !== 'object' || typeof response.signature !== 'number')
                throw new Error('Invalid behaviour signature');
            responses[response.signature] = {

                callback: callback,
                timeout: setTimeout(function () {

                    delete responses[response.signature];
                    timeouts[response.signature] = true;
                }, TIMEOUT * 1000)
            };
            return;
        }
        if (typeof returns !== 'object' || typeof response !== 'object' ||
            typeof response.response !== 'object' || Array.isArray(response.response)) {

            if (middleware && (typeof response !== 'object' || !Array.isArray(response.response)))
                return false;
            utils.respond(request.res, response || {});
            return true;
        }
        var keys = Object.keys(returns);
        var body = {};
        for (var i = 0; i < keys.length; i++) {

            if (typeof returns[keys[i]].type !== 'string') {

                throw new Error('Invalid return type');
            }
            var value = utils.getValueAtPath(typeof returns[keys[i]].key === 'string' ?
                returns[keys[i]].key : keys[i], response.response);
            switch (returns[keys[i]].type) {

                case 'header':
                    if (value) request.res.set(keys[i], value);
                    break;
                case 'body':
                    body[keys[i]] = value;
                    break;
                case 'middleware':
                    request.req[keys[i]] = value;
                    break;
                default:
                    new Error('Invalid return type');
                    break;
            }
        }
        if (Object.keys(body).length > 0) {

            response.response = body;
            utils.respond(request.res, response);
            return true;
        }
        return false;
    },
    setSignature: function (req, res, next, response) {

        if (typeof response !== 'object' || typeof response.signature !== 'number')
            throw new Error('Invalid behaviour signature');
        if (timeouts[response.signature]) return next(new Error('Request timeout'));
        if (!requests[response.signature]) requests[response.signature] = [];
        if (requests[response.signature].length === 0) {

            var request = {

                req: req,
                res: res,
                next: next,
                timeout: setTimeout(function () {

                    if (requests[response.signature]) {

                        var index = requests[response.signature].indexOf(request);
                        if (index > -1) requests[response.signature].splice(index, 1);
                    }
                    if (!req.aborted && !res.headersSent) utils.respond(res, response);
                }, TIMEOUT * 1000)
            };
            requests[response.signature].push(request);
        } else utils.respond(res, response);
        if (responses[response.signature]) {

            clearTimeout(responses[response.signature].timeout);
            var callback = responses[response.signature].callback;
            delete responses[response.signature];
            callback();
        }
    },
    getSignature: function (req) {

        var signature = Number(req.get('Behaviour-Signature') || undefined);
        if (!isNaN(signature)) return signature;
        return new Date();
    },
    getRequest: function (req, res, next, response) {

        var request = typeof response === 'object' && typeof response.signature === 'number' &&
            Array.isArray(requests[response.signature]) ? requests[response.signature].pop() : {

            req: req,
            res: res,
            next: next
        };
        if (request && request.timeout) {

            clearTimeout(request.timeout);
            delete request.timeout;
        }
        if (response.signature) delete requests[response.signature];
        return request && !request.req.aborted && !request.res.headersSent && request;
    },
    setCorsOptions: function (corsOptions, origins, options, req) {

        var origin = ('' + origins).indexOf('*' || req.headers.origin) > -1 ? req.headers.origin || '*' :
            origins == true;
        corsOptions.origin = origin;
        if (origin) {

            var methods = ['OPTIONS'].concat(typeof options.method === 'string' &&
                options.method.length > 0 ? [options.method.toUpperCase()] : []).join(',');
            corsOptions.methods = methods;
            var headers = ['Origin', 'X-Requested-With', 'Content-Type', 'Accept',
                'Behaviour-Signature'].concat(Object.keys(req.headers).map(function (header) {

                    return req.rawHeaders.find(function (rawHeader) {

                        return rawHeader.toLowerCase() === header.toLowerCase();
                    });
                })).concat(Object.keys(typeof options.parameters === 'object' ?
                    options.parameters : {}).filter(function (key) {

                        return options.parameters[key].type === 'header';
                    }).map(function (key) {

                        return options.parameters[key].key;
                    })).reduce(function (headers, header) {

                        if (headers.indexOf(header) === -1) headers.push(header);
                        return headers;
                    }, []).join(',');
            corsOptions.allowedHeaders = headers;
            if (typeof options.returns === 'object') {

                var returns = Object.keys(options.returns);
                if (returns.length > 0) corsOptions.exposedHeaders = returns.filter(function (key) {

                    return options.returns[key].type === 'header';
                }).join(',');
            }
        }
    }
};

var utils = module.exports;