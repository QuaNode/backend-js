/*jslint node: true */
'use strict';

var express = require('express');
var paginate = require('express-paginate');
var define = require('define-js');
var utility = require('path');
var unless = require('express-unless');
var stream = require('stream');
var converter = require('converter');

var QueryExpression = require('./model.js').QueryExpression;
var ModelEntity = require('./model.js').ModelEntity;
var BusinessBehaviourType = require('./business/BusinessBehaviour.js').BusinessBehaviourType;
var BusinessBehaviour = require('./business/BusinessBehaviour.js').BusinessBehaviour;
var BusinessController = require('./business/BusinessController.js').BusinessController;

var routers = {};
var businessControllerSharedInstances = {};
var behaviours = {};
var types = {

    'database': BusinessBehaviourType.OFFLINESYNC,
    'integration': BusinessBehaviourType.ONLINESYNC,
    'database_with_action': BusinessBehaviourType.OFFLINEACTION,
    'integration_with_action': BusinessBehaviourType.ONLINEACTION
};
var defaultPrefix = null;
var app = module.exports.app = express();

var businessController = function(key) {

    var businessControllerSharedInstance = typeof key === 'string' && businessControllerSharedInstances[key];
    if (!businessControllerSharedInstance) {

        businessControllerSharedInstance = new BusinessController({

            modelController: require('./model.js').modelController,
            ModelEntity: ModelEntity,
            QueryExpression: QueryExpression,
            ComparisonOperators: require('./model/QueryExpression.js').ComparisonOperators,
            //cacheController : cacheController,
            operationCallback: function(data, operationType, operationSubtype) {

                /*if (data && data.error) {

                 try {

                 throw new Error(operationType + '   ' + operationSubtype + '   ' + JSON.stringify(data, null, 3));
                 } catch (e) {

                 logController.log(e, JSON.parse(window.localStorage.getItem('currentUser')));
                 }
                 }*/
            }
        });
        if (typeof key === 'string') businessControllerSharedInstances[key] = businessControllerSharedInstance;
    }
    return businessControllerSharedInstance;
};

module.exports.businessController = businessController;

var getValueAtPath = function(path, object) {

    var pathComponents = path.split('.');
    var value = object;
    for (var j = 0; value && j < pathComponents.length; j++) {

        value = value[pathComponents[j]];
    }
    return value;
};

var getInputObjects = function(parameters, req) {

    if (typeof parameters !== 'object') {

        return {};
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
                inputObjects[keys[i]] = getValueAtPath(parameters[keys[i]].key, req.body);
                break;
            case 'query':
                inputObjects[keys[i]] = req.query[parameters[keys[i]].key];
                break;
            case 'path':
                inputObjects[keys[i]] = req.params[parameters[keys[i]].key];
                break;
            default:
                new Error('Invalid parameter type');
                break;
        }
    }
    return inputObjects;
};

var sendConverted = function(res, json, format) {

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
};

var respond = function(res, object) {

    res.format({

        json: function() {

            res.json(object);
        },
        text: function() {

            sendConverted(res, JSON.stringify(object), 'csv');
        },
        xml: function() {

            sendConverted(res, JSON.stringify(object), 'xml');
        }
    });
};

var setResponse = function(returns, req, res, response) {

    if (typeof returns !== 'object') {

        if (res) respond(res, response);
        return;
    }
    var keys = Object.keys(returns);
    var body = {};
    for (var i = 0; i < keys.length; i++) {

        if (typeof returns[keys[i]].type !== 'string') {

            throw new Error('Invalid return type');
        }
        var value = getValueAtPath(typeof returns[keys[i]].key !== 'string' ? returns[keys[i]].key : keys[i], response.response);
        switch (returns[keys[i]].type) {

            case 'header':
                if (value && res) res.set(keys[i], value);
                break;
            case 'body':
                if (res) body[keys[i]] = value;
                if (req) req[keys[i]] = value;
                break;
            default:
                new Error('Invalid return type');
                break;
        }
    }
    if (res) {

        response.response = body;
        respond(res, response);
    }
};

module.exports.behaviour = function(path) {

    if (!defaultPrefix && typeof path === 'string' && path.length > 0) defaultPrefix = path;
    var prefix = path || defaultPrefix;
    var router = null;
    if (typeof prefix === 'string' && prefix.length > 0) {

        router = routers[prefix];
        if (!router) {

            if (typeof app !== 'function' || typeof app.use !== 'function') {

                throw new Error('Invalid express app');
            }
            router = express.Router({

                caseSensitive: true,
                mergeParams: true,
                strict: true
            });
            router.use(paginate.middleware(10, 50));
            app.use(prefix, router);
            routers[prefix] = router;
        }
    } else router = app;
    return function(options, getConstructor) {

        if (typeof options !== 'object') {

            throw new Error('Invalid definition object');
        }
        if (typeof options.name !== 'string' || options.name.length === 0) {

            throw new Error('Invalid behaviour name');
        }
        if (typeof options.type !== 'string' || !types[options.type]) {

            options.type = 'database';
        }
        if (typeof options.version !== 'string' || options.version.length === 0) {

            throw new Error('Invalid behaviour version');
        }
        if (typeof options.superConstructor === 'function' && !(options.superConstructor.prototype instanceof BusinessBehaviour)) {

            throw new Error('Super behaviour constructor does not inherit from BusinessBehaviour');
        }
        if (typeof getConstructor !== 'function') {

            throw new Error('Invalid constructor');
        }
        var BehaviourConstructor = typeof options.superConstructor === 'function' ? define(getConstructor)
            .extend(options.superConstructor).parameters(options.superDefaults) : define(getConstructor).extend(BusinessBehaviour)
            .parameters({

                type: types[options.type]
            });
        var req_handler = function(req, res, next) {

            var inputObjects = getInputObjects(options.parameters, req);
            if (options.paginate) {

                inputObjects.paginate = true;
                inputObjects.page = req.query.page;
                inputObjects.limit = req.query.limit;
            }
            var behaviour = new BehaviourConstructor({

                type: types[options.type],
                priority: options.priority || 0,
                inputObjects: inputObjects
            });
            var cancel = businessController(typeof options.queue == 'function' ? options.queue() : options.queue)
                .runBehaviour(behaviour, options.paginate ? function(property, superProperty) {

                    var page = {

                        modelObjects: 'modelObjects',
                        pageCount: 'pageCount'
                    };
                    return typeof options.map === 'function' ? options.map(property, superProperty) || page[property] : page[property];
                } : options.map, function(behaviourResponse, error) {

                    if (typeof error === 'object' || typeof behaviourResponse !== 'object') {

                        error.name = options.name;
                        error.version = options.version;
                        next(error || new Error('Error while executing ' + options.name + ' behaviour, version ' + options.version + '!'));
                    } else {

                        var response = {

                            behaviour: options.name,
                            version: options.version,
                            response: options.paginate ? behaviourResponse.modelObjects || behaviourResponse : behaviourResponse
                        };
                        if (options.paginate) response.has_more = paginate.hasNextPages(req)(typeof behaviourResponse.pageCount === 'number' ?
                            behaviourResponse.pageCount : 1);
                        if (typeof options.path == 'string' && options.path.length > 0) setResponse(options.returns, undefined, res, response);
                        else {

                            setResponse(options.returns, req, undefined, response);
                            next();
                        }
                    }
                });
            if (typeof options.unless === 'function') {

                req_handler.unless = unless;
                req_handler = req_handler.unless({

                    custom: function(request) {

                        return options.unless({

                            path: request.path,
                            method: request.method,
                            secure: request.secure,
                            ip: request.ip
                        });
                    }
                });
            }
            req.on('close', function() {

                if (typeof cancel === 'function') cancel();
            });
        };
        if (typeof options.path == 'string' && options.path.length > 0 && typeof options.method === 'string' &&
            typeof router[options.method.toLowerCase()] == 'function') router[options.method.toLowerCase()](options.path, req_handler);
        else app.use(req_handler);
        behaviours[options.name] = {

            name: options.name,
            version: options.version,
            method: options.method,
            path: options.path,
            parameters: options.parameters,
            returns: options.returns
        };
        return BehaviourConstructor;
    };
};

module.exports.behaviours = function(path) {

    app.get(typeof path === 'string' ? utility.join(path, '/behaviours') : '/behaviours', function(req, res) {

        res.json(behaviours);
    });
};
//var CacheController = require('./cache/CacheController.js').CacheController;
//var cacheController = new CacheController();
//var LogController = require('./logs/LogController.js').LogController;
//var logController = new LogController();
/*window.onerror = function(errorMsg, url, lineNumber) {

 try {

 throw new Error(errorMsg + '   ' + url + '   ' + lineNumber);
 } catch (e) {

 logController.log(e, JSON.parse(window.localStorage.getItem('currentUser')));
 }
 };*/
