/*jslint node: true */
/*jshint esversion: 6 */
'use strict';

let express = require('express');
let paginate = require('express-paginate');
let Route = require('route-parser');
let define = require('define-js');
let unless = require('express-unless');
let businessController = require('./controller.js').businessController;
let BusinessBehaviourType = require('./business/BusinessBehaviour.js').BusinessBehaviourType;
let BusinessBehaviour = require('./business/BusinessBehaviour.js').BusinessBehaviour;
let getInputObjects = require('./utils.js').getInputObjects;
let setResponse = require('./utils.js').setResponse;
let respond = require('./utils.js').respond;
let getSignature = require('./utils.js').getSignature;
let setSignature = require('./utils.js').setSignature;
let getRequest = require('./utils.js').getRequest;

var backend = module.exports;

var join = backend.join = (function () {

    var utility = require('url');
    return function (s1, s2) {

        return utility.resolve(s1.substr(0, s1.endsWith('/') ? s1.length - 1 :
            s1.length) + '/', s2.substr(s2.startsWith('/') ? 1 : 0));
    };
})();

var routers = {};

var behaviours = {

    behaviours: {

        method: 'GET',
        path: '/behaviours'
    }
};

var compareRoutes = function (route1, route2) {

    var route = (route1 && route1.name && route1.name.indexOf(':') > -1 && route1) || route2;
    if (route === route2) {

        route2 = route1;
        route1 = route;
    }
    if (route && route.name) route = new Route(route.name);
    return (route && route.match((route2 && route2.name) || ' ') || route1.name === (route2 && route2.name)) &&
        (route1.method || '').toLowerCase() === ((route2 && route2.method) || '').toLowerCase();
};

var types = {

    database: BusinessBehaviourType.OFFLINESYNC,
    database_with_action: BusinessBehaviourType.OFFLINEACTION,
    integration: BusinessBehaviourType.ONLINESYNC,
    integration_with_action: BusinessBehaviourType.ONLINEACTION
};

var defaultPrefix = '/';

var app = backend.app = express();

backend.static = express.static;

backend.behaviour = function (path, config) {

    if (typeof app !== 'function' || typeof app.use !== 'function') {

        throw new Error('Invalid express app');
    }
    if (typeof path === 'object') config = path;
    return function (options, getConstructor) {

        if (typeof options !== 'object') {

            throw new Error('Invalid definition object');
        }
        if (typeof options.type !== 'string' || types[options.type] === undefined) {

            options.type = 'database';
        }
        if (typeof options.version !== 'string' || options.version.length === 0) {

            throw new Error('Invalid behaviour version');
        }
        if (typeof options.inherits === 'function' &&
            !(options.inherits.prototype instanceof BusinessBehaviour)) {

            throw new Error('Super behaviour constructor does not inherit from BusinessBehaviour');
        }
        if (typeof getConstructor !== 'function') {

            throw new Error('Invalid constructor');
        }
        var forFrontend = typeof options.name === 'string' && options.name.length > 0;
        var notDuplicate = function () {

            if (behaviours[options.name] && (typeof config !== 'object' ||
                typeof config.skipSameRoutes !== 'boolean' || !config.skipSameRoutes))
                throw new Error('Duplicated behavior name: ' + options.name);
            return !behaviours[options.name];
        }();
        var BehaviourConstructor = typeof options.inherits === 'function' ?
            define(getConstructor).extend(options.inherits).parameters({

                type: types[options.type],
                inputObjects: options.defaults
            }) : define(getConstructor).extend(BusinessBehaviour).parameters({

                type: types[options.type]
            });
        if (forFrontend && notDuplicate) {

            if (options.name === 'behaviours') {

                throw new Error('behaviours is a reserved name');
            }
            var isRouterMiddleware = typeof options.path === 'string' && options.path.length > 0;
            var isRoute = isRouterMiddleware && typeof options.method === 'string' &&
                typeof app[options.method.toLowerCase()] === 'function';
            var longPolling = isRoute && Object.keys(types).indexOf(options.type) > 1;
            var hasPlugin = typeof options.plugin === 'function';
            var prefix = typeof path === 'string' && path.length > 0 ? join(defaultPrefix, path) :
                defaultPrefix !== '/' ? defaultPrefix : null;
            var behaviour_runner = function (req, res, next, inputObjects, er) {

                var signature = getSignature(req);
                var response = {

                    behaviour: options.name,
                    version: options.version
                };
                if (longPolling) {

                    response.signature = new Date(signature).getTime();
                    setSignature(req, res, next, response);
                    if (typeof signature === 'number') return;
                }
                if (options.paginate) {

                    inputObjects.paginate = true;
                    inputObjects.page = req.query.page;
                    inputObjects.limit = req.query.limit;
                }
                var behaviour = new BehaviourConstructor({

                    name: options.name,
                    type: types[options.type],
                    priority: options.priority || 0,
                    inputObjects: inputObjects
                });
                var behaviour_callback = function (behaviourResponse, error) {

                    var request = getRequest(req, res, next, response);
                    if (!request) {

                        if (longPolling) setResponse(behaviour_callback.bind(null, behaviourResponse,
                            error), response);
                        return;
                    }
                    if (longPolling) delete response.signature;
                    if (typeof error === 'object' || typeof behaviourResponse !== 'object') {

                        if (error) error.name = options.name;
                        if (error) error.version = options.version;
                        request.next(error || er || new Error('Error while executing ' + options.name +
                            ' behaviour, version ' + options.version + '!'));
                    } else {

                        response.response = options.paginate ? behaviourResponse.modelObjects ||
                            behaviourResponse : behaviourResponse;
                        if (options.paginate) response.has_more = paginate.hasNextPages(request.req)
                            (typeof behaviourResponse.pageCount === 'number' ?
                                behaviourResponse.pageCount : 1);
                        if (typeof options.returns !== 'function') {

                            if (!setResponse(options.returns, !isRoute, request, response)) request.next();
                        } else options.returns(request.req, request.res, function (outputObjects) {

                            respond(request.res, outputObjects);
                        });
                    }
                };
                var cancel = businessController(typeof options.queue === 'function' ?
                    options.queue(options.name, inputObjects) : options.queue,
                    options.memory).runBehaviour(behaviour, options.paginate ?
                        function (property, superProperty) {

                            var page = {

                                modelObjects: 'modelObjects',
                                pageCount: 'pageCount'
                            };
                            return typeof options.map === 'function' ? options.map(property, superProperty) ||
                                page[property] : page[property];
                        } : options.map, behaviour_callback);
                req.on('close', function () {

                    if (typeof cancel === 'function' && !longPolling) cancel();
                });
            };
            var req_handler = function (req, res, next) {

                if (typeof options.parameters !== 'function') {

                    if (!isRoute || req.complete) getInputObjects(options.parameters,
                        Object.keys(behaviours).map(function (name) {

                            var suffix = behaviours[name] && behaviours[name].path;
                            return typeof prefix === 'string' && req.path.startsWith(prefix) &&
                                typeof suffix === 'string' ? join(prefix, suffix) : suffix || prefix;
                        }), req, function (inputObjects) {

                            behaviour_runner(req, res, next, inputObjects);
                        });
                    else req.socket.on('end', req_handler.bind(null, req, res, next));
                } else options.parameters(req, res, function (inputObjects, er) {

                    if (req.complete) behaviour_runner(req, res, next, inputObjects, er);
                    else throw new Error('Parameters callback function called before all request data consumed');
                });
            };
            if (Array.isArray(options.unless)) {

                req_handler.unless = unless;
                req_handler = req_handler.unless({

                    custom: function (request) {

                        return options.unless.map(function (name) {

                            return {

                                name: (behaviours[name] && behaviours[name].path) || name,
                                method: behaviours[name] && behaviours[name].method
                            };
                        }).filter(function (opt) {

                            var suffix = opt.name;
                            var method = opt.method;
                            var route = typeof prefix === 'string' && request.path.startsWith(prefix) &&
                                typeof suffix === 'string' ? join(prefix, suffix) : suffix || prefix;
                            return compareRoutes({

                                name: route,
                                method: method
                            }, {

                                name: request.path,
                                method: request.method
                            });
                        }).length > 0;
                    }
                });
            }
            if (isRoute) {

                var keys = Object.keys(behaviours);
                if (keys.some(function (key) {

                    return compareRoutes({

                        name: behaviours[key].path,
                        method: behaviours[key].method
                    }, {

                        name: options.path,
                        method: options.method
                    });
                })) throw new Error('Duplicated behavior path: ' + options.path);
                var router = app;
                if (typeof prefix === 'string' && prefix.length > 0) {

                    router = routers[prefix];
                    if (!router) {

                        router = express.Router({

                            caseSensitive: true,
                            mergeParams: true,
                            strict: true
                        });
                        router.use(paginate.middleware(10, 50));
                        app.use(prefix, router);
                        routers[prefix] = router;
                    }
                }
                router = router[options.method.toLowerCase()].bind(router);
                if (hasPlugin) router(options.path, options.plugin, req_handler);
                else router(options.path, req_handler);
                behaviours[options.name] = {

                    version: options.version,
                    method: options.method,
                    path: options.path,
                    parameters: options.parameters,
                    returns: options.returns
                };
            } else if (isRouterMiddleware) {

                var route = typeof prefix === 'string' && prefix.length > 0 ? join(prefix, options.path) :
                    options.path;
                if (hasPlugin) app.use(route, options.plugin, req_handler);
                else app.use(route, req_handler);
            } else {

                if (hasPlugin) app.use(options.plugin, req_handler);
                else app.use(req_handler);
            }
        }
        return BehaviourConstructor;
    };
};

backend.behaviours = function (path, parser) {

    if (defaultPrefix === '/' && typeof path === 'string' && path.length > 0) defaultPrefix = path;
    var prefix = path || defaultPrefix;
    app.get(typeof prefix === 'string' ? join(prefix, '/behaviours') : '/behaviours', function (req, res) {

        respond(res, behaviours, parser);
    });
    return behaviours;
};

backend.meta = behaviours;

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
