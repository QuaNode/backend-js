/*jslint node: true */
'use strict';

var express = require('express');
var paginate = require('express-paginate');
var define = require('define-js');
var utility = require('path');

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

var getInputObjects = function(parameters, req) {

    if (typeof parameters !== 'object') {

        return {};
    }
    var keys = Object.keys(parameters);
    var inputObjects = {};
    for (var i = 0; i < keys.length; i++) {

        if (typeof parameters[keys[i]].key !== 'string') {

            throw new Error('Invalid behaviour key');
        }
        if (typeof parameters[keys[i]].type !== 'string') {

            throw new Error('Invalid behaviour type');
        }
        switch (parameters[keys[i]].type) {

            case 'header':
                inputObjects[keys[i]] = req.get(parameters[keys[i]].key);
                break;
            case 'body':
                var pathComponents = parameters[keys[i]].key.split('.');
                var value = req.body;
                for (var j = 0; j < pathComponents.length; j++) {

                    value = value[pathComponents[j]];
                }
                inputObjects[keys[i]] = value;
                break;
            case 'query':
                inputObjects[keys[i]] = req.query[parameters[keys[i]].key];
                break;
            case 'path':
                inputObjects[keys[i]] = req.params[parameters[keys[i]].key];
                break;
            default:
                new Error('Invalid behaviour type');
                break;
        }
    }
    return inputObjects;
};

var app = module.exports.app = express();

module.exports.behaviour = function(path) {

    var prefix = path;
    if (typeof prefix !== 'string') {

        prefix = '/';
    }
    var router = routers[prefix];
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
        if (typeof options.path !== 'string' || options.path.length === 0) {

            throw new Error('Invalid path');
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
                        res.json(response);
                    }
                });
            req.on('close', function() {

                if (typeof cancel === 'function') cancel();
            });
        };
        if (typeof options.method === 'string' && typeof router[(options.method).toLowerCase()] == 'function') {

            router[(options.method).toLowerCase()](options.path, req_handler);
        } else {

            throw new Error('Invalid method');
        }
        behaviours[options.name] = {

            name: options.name,
            version: options.version,
            method: options.method,
            path: options.path,
            parameters: options.parameters
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
