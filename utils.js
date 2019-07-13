/*jslint node: true */
'use strict';

var stream = require('stream');
var converter = require('converter');

module.exports = {

    getValueAtPath: function(path, object) {

        var pathComponents = path.split('.');
        var value = object;
        for (var j = 0; value && j < pathComponents.length; j++) {

            value = value[pathComponents[j]];
        }
        return value;
    },
    getCorrectValue: function(value) {

        switch (value) {

            case 'true':
            case 'True':
                return true;
            case 'false':
            case 'False':
                return false;
            case 'undefined':
            case 'Undefined':
            case '*':
                return undefined;
            case 'null':
            case 'Null':
                return null;
        }
        return value;
    },
    setInputObjects: function(inputObjects, req, name, parameter, key, type) {

        switch (type) {

            case 'header':
                inputObjects[name] = utils.getCorrectValue(req.get(key));
                break;
            case 'body':
                inputObjects[name] = utils.getCorrectValue(utils.getValueAtPath(key, req.body));
                break;
            case 'query':
                inputObjects[name] = utils.getCorrectValue(req.query[key]);
                break;
            case 'path':
                inputObjects[name] = utils.getCorrectValue(req.params[key]);
                break;
            case 'middleware':
                inputObjects[name] = utils.getCorrectValue(req[key]);
                break;
            default:
                new Error('Invalid parameter type');
                break;
        }
        if (inputObjects[name] === undefined || inputObjects[name] === null) {

            if (typeof parameter.alternativeKey === 'string' && parameter.alternativeKey !== key)
                utils.setInputObjects(inputObjects, req, name, parameter, parameter.alternativeKey, type);
            else if (typeof parameter.alternativeType === 'string' && parameter.alternativeType !== type)
                utils.setInputObjects(inputObjects, req, name, parameter, key, parameter.alternativeType);
            else if (parameter.key !== key) utils.setInputObjects(inputObjects, req, name, {

                key: parameter.key
            }, parameter.key, type);
        }
    },
    getInputObjects: function(parameters, req, callback) {

        if (typeof parameters !== 'object') {

            callback(req.body);
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
            utils.setInputObjects(inputObjects, req, keys[i], parameter, parameter.key, parameter.type);
        }
        callback(inputObjects);
    },
    sendConverted: function(res, json, format) {

        var outStream = converter({

            from: 'json',
            to: format
        });
        outStream.on('data', function(chunk) {

            res.send(chunk);
        });
        var inStream = new stream.PassThrough();
        inStream.end(json);
        inStream.pipe(outStream);
    },
    respond: function(res, object, format) {

        var responders = {

            json: function() {

                res.json(object);
            },
            text: function() {

                utils.sendConverted(res, JSON.stringify(object), 'csv');
            },
            xml: function() {

                utils.sendConverted(res, JSON.stringify(object), 'xml');
            }
        };
        if (typeof format === 'string' && responders[format]) responders[format]();
        else res.format(responders);
    },
    setResponse: function(returns, req, res, response) {

        if (typeof returns !== 'object' || typeof response !== 'object' || typeof response.response !== 'object' ||
            Array.isArray(response.response)) {

            utils.respond(res, response || {});
            return true;
        }
        var keys = Object.keys(returns);
        var body = {};
        for (var i = 0; i < keys.length; i++) {

            if (typeof returns[keys[i]].type !== 'string') {

                throw new Error('Invalid return type');
            }
            var value = utils.getValueAtPath(typeof returns[keys[i]].key === 'string' ? returns[keys[i]].key : keys[i], response.response);
            switch (returns[keys[i]].type) {

                case 'header':
                    if (value) res.set(keys[i], value);
                    break;
                case 'body':
                    body[keys[i]] = value;
                    break;
                case 'middleware':
                    req[keys[i]] = value;
                    break;
                default:
                    new Error('Invalid return type');
                    break;
            }
        }
        if (Object.keys(body).length > 0) {

            response.response = body;
            utils.respond(res, response);
            return true;
        }
        return false;
    },
    allowCrossOrigins: function(options, res, origins) {

        res.header('Access-Control-Allow-Origin', origins || options.origins || '*');
        if (typeof options.method === 'string' && options.method.length > 0) {

            res.header('Access-Control-Allow-Methods', options.method.toUpperCase() + ',OPTIONS');
        }
        if (typeof options.parameters === 'object') {

            res.header('Access-Control-Allow-Headers', 'Content-type,Accept' +
                Object.keys(options.parameters).map(function(key) {

                    return options.parameters[key].type === 'header' ? ',' + options.parameters[key].key : '';
                }).reduce(function(accumulator, key) {

                    return accumulator + key;
                }, ''));
        }
        if (typeof options.returns === 'object') {

            res.header('Access-Control-Expose-Headers', Object.keys(options.returns).map(function(key) {

                return options.returns[key].type === 'header' ? key : '';
            }).reduce(function(accumulator, key) {

                return accumulator + (accumulator.length > 0 ? ',' : '') + key;
            }, ''));
        }
    }
};

var utils = module.exports;
