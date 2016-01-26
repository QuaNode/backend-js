/*jslint node: true */
'use strict';

var express = require('express');
var define = require('define-js');

var QueryExpression = require('./model.js').QueryExpression;
var ModelEntity = require('./model.js').ModelEntity;
var BusinessBehaviourType = require('./business/BusinessBehaviour.js').BusinessBehaviourType;
var BusinessController = require('./business/BusinessController.js').BusinessController;

var routers = {};
var businessControllerSharedInstances = {};

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

var getBehaviourParams = function(oldParams, req) {

    if (typeof oldParams !== 'object') {

        return;
    }
    var keys = Object.keys(oldParams);
    var newParams = {};
    for (var i = 0; i < keys.length; i++) {

        if (typeof oldParams[keys[i]].key !== 'string') {

            throw new Error('Invalid behaviour key');
        }
        if (typeof oldParams[keys[i]].type !== 'string') {

            throw new Error('Invalid behaviour type');
        }
        switch (oldParams[keys[i]].type) {

            case 'header':
                newParams[keys[i]] = req.get(oldParams[keys[i]].key);
                break;
            case 'body':
                var pathNodes = oldParams[keys[i]].key.split('.');
                var bodyParamValue = req.body;
                for (var j = 0; j < pathNodes.length; j++) {

                    bodyParamValue = bodyParamValue[pathNodes[j]];
                }
                newParams[keys[i]] = bodyParamValue;
                break;
            case 'query':
                newParams[keys[i]] = req.query[oldParams[keys[i]].key];
                break;
            case 'path':
                newParams[keys[i]] = req.params[oldParams[keys[i]].key];
                break;
            default:
                new Error('Invalid behaviour type');
                break;
        }
    }
    return newParams;
};

module.exports.behaviour = function(app, path) {

    var prefix = path;
    if (typeof prefix !== 'string') {

        prefix = '/';
    }
    var router = routers[prefix];
    if (!router) {

        if (typeof app !== 'object' || typeof app.use !== 'function') {

            throw new Error('Invalid express app');
        }
        router = express.Router({

            caseSensitive: true,
            mergeParams: true,
            strict: true
        });
        app.use(prefix, router);
        routers[prefix] = router;
    }
    return function(definitionObj, getConstructor) {

        if (typeof definitionObj !== 'object') {

            throw new Error('Invalid definition object');
        }
        if (typeof definitionObj.name !== 'string' || definitionObj.name.length === 0) {

            throw new Error('Invalid behaviour name');
        }
        if (typeof definitionObj.version !== 'string' || definitionObj.version.length === 0) {

            throw new Error('Invalid behaviour version');
        }
        if (typeof definitionObj.path !== 'string' || definitionObj.path.length === 0) {

            throw new Error('Invalid path');
        }
        if (typeof definitionObj.superConstructor !== 'function') {

            throw new Error('Invalid super constructor function');
        }
        if (typeof definitionObj.superDefaults !== 'object') {

            throw new Error('Invalid super constructor defaults');
        }
        if (typeof getConstructor !== 'function') {

            throw new Error('Invalid constructor');
        }
        var BehaviourConstructor = define(getConstructor)
            .extend(definitionObj.superConstructor)
            .parameters(definitionObj.superDefaults);
        var req_handler = function(req, res, next) {

            var params = getBehaviourParams(definitionObj.parameters, req);
            var behaviour = new BehaviourConstructor({

                type: BusinessBehaviourType.OFFLINESYNC,
                priority: 0,
                inputObjects: params
            });
            businessController(typeof definitionObj.queue == 'function' ? definitionObj.queue() : definitionObj.queue)
                .runBehaviour(behaviour, null, function(behaviourResponse, error) {

                    if (typeof error === 'object' || typeof behaviourResponse !== 'object') {

                        next(error || new Error('Error while executing ' + definitionObj.name + ' behaviour, version ' + definitionObj.version + '!'));
                    } else {

                        res.json(behaviourResponse);
                    }
                });
        };
        if (typeof definitionObj.method === 'string' && typeof router[(definitionObj.method).toLowerCase()] == 'function') {

            router[(definitionObj.method).toLowerCase()](definitionObj.path, req_handler);
        } else {

            throw new Error('Invalid method');
        }
    };
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
