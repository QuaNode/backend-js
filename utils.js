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
    getInputObjects: function(parameters, req) {

        if (typeof parameters !== 'object') {

            return req.body;
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
            switch (parameters[keys[i]].type) {

                case 'header':
                    inputObjects[keys[i]] = req.get(parameters[keys[i]].key);
                    break;
                case 'body':
                    inputObjects[keys[i]] = utils.getValueAtPath(parameters[keys[i]].key, req.body);
                    break;
                case 'query':
                    inputObjects[keys[i]] = req.query[parameters[keys[i]].key];
                    break;
                case 'path':
                    inputObjects[keys[i]] = req.params[parameters[keys[i]].key];
                    break;
                case 'middleware':
                    inputObjects[keys[i]] = req[parameters[keys[i]].key];
                    break;
                default:
                    new Error('Invalid parameter type');
                    break;
            }
        }
        return inputObjects;
    },
    sendConverted: function(res, json, format) {

        var outStream = converter({

            from: 'json',
            to: format
        });
        outStream.on("data", function(chunk) {

            chunks.push(chunk);
        });
        outStream.on("end", function() {

            res.send(Buffer.concat(chunks));
        });
        var inStream = new stream.PassThrough();
        var chunks = [];
        inStream.read(new Buffer(json)).pipe(outStream).end();
    },
    respond: function(res, object) {

        res.format({

            json: function() {

                res.json(object);
            },
            text: function() {

                utils.sendConverted(res, JSON.stringify(object), 'csv');
            },
            xml: function() {

                utils.sendConverted(res, JSON.stringify(object), 'xml');
            }
        });
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

                return options.returns[key].type === 'header' ? ',' + key : '';
            }).reduce(function(accumulator, key) {

                return accumulator + key;
            }, ''));
        }
    }
};

var utils = module.exports;