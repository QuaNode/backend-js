/*jslint node: true */
/*jshint esversion: 6 */
'use strict';

var express = require('express');
var paginate = require('express-paginate');
var Route = require('route-parser');
var define = require('define-js');
var unless = require('express-unless');
var parse = require('parseparams');
var { BusinessBehaviourType, BusinessBehaviour } = require('behaviours-js');
var businessController = require('./controller.js').businessController;
var getLogBehaviour = require('./log.js').getLogBehaviour;
var {
    getInputObjects,
    setResponse,
    respond,
    getSignature,
    setSignature,
    getRequest
} = require('./utils.js');

var backend = module.exports;

var app = backend.app = express();

backend.serve = express.static;

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

var BEHAVIOURS = {};

var FetchBehaviours = {};

var LogBehaviours = {};

var compareRoutes = function (route1, route2) {

    var route = (route1 && route1.name && route1.name.indexOf(':') > -1 && route1) || route2;
    if (route === route2) {

        route2 = route1;
        route1 = route;
    }
    if (route && route.name) route = new Route(route.name);
    return (route && route.match((route2 && route2.name) || ' ') ||
        route1.name === (route2 && route2.name)) &&
        (route1.method || '').toLowerCase() === ((route2 && route2.method) || '').toLowerCase();
};

var types = {

    database: BusinessBehaviourType.OFFLINESYNC,
    database_with_action: BusinessBehaviourType.OFFLINEACTION,
    integration: BusinessBehaviourType.ONLINESYNC,
    integration_with_action: BusinessBehaviourType.ONLINEACTION
};

var defaultPrefix = '/';

var defaultRemotes = {};

backend.behaviour = function (path, config) {

    if (typeof app !== 'function' || typeof app.use !== 'function') {

        throw new Error('Invalid express app');
    }
    if (typeof path === 'object') {

        config = path;
        path = config.path;
    }
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
        var named = typeof options.name === 'string' && options.name.length > 0;
        var unduplicated = function () {

            var skipSameRoutes;
            if (typeof config === 'object') skipSameRoutes = config.skipSameRoutes;
            if (behaviours[options.name] && (typeof skipSameRoutes !== 'boolean' ||
                !skipSameRoutes)) throw new Error('Duplicated behavior name: ' + options.name);
            return !behaviours[options.name];
        }();
        var BehaviourConstructor = define(getConstructor).extend(getLogBehaviour(options, config,
            types, BEHAVIOURS, defaultRemotes, FetchBehaviours, LogBehaviours)).defaults({

                type: types[options.type]
            });
        if (options.fetcher) {

            var fetcher = typeof options.fetcher === 'string' ? options.fetcher : '';
            FetchBehaviours[fetcher] = BehaviourConstructor;
        }
        if (options.logger) {

            var logger = typeof options.logger === 'string' ? options.logger : '';
            LogBehaviours[logger] = BehaviourConstructor;
        }
        if (named && unduplicated) {

            if (options.name === 'behaviours') {

                throw new Error('behaviours is a reserved name');
            }
            BEHAVIOURS[options.name] = {

                options: options,
                constructor: BehaviourConstructor
            };
            var isRouterMiddleware = typeof options.path === 'string' && options.path.length > 0;
            var isRoute = isRouterMiddleware && typeof options.method === 'string' &&
                typeof app[options.method.toLowerCase()] === 'function';
            var longPolling = isRoute && Object.keys(types).indexOf(options.type) > 1;
            if (!Array.isArray(options.plugins)) options.plugins = [];
            if (typeof options.plugin === 'function') options.plugins.push(options.plugin);
            var req_plugin = options.plugins.reduce(function (req_plugin, plugin) {

                if (typeof plugin === 'function' && parse(plugin)[0] !== 'out') return plugin;
                return req_plugin;
            }, undefined);
            var res_plugin = options.plugins.reduce(function (res_plugin, plugin) {

                if (typeof plugin === 'function' && parse(plugin)[0] === 'out') return plugin;
                return res_plugin;
            }, undefined);
            var prefix = typeof path === 'string' && path.length > 0 ?
                join(defaultPrefix, path) : defaultPrefix !== '/' ? defaultPrefix : null;
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

                        if (longPolling) setResponse(behaviour_callback.bind(null,
                            behaviourResponse, error), response);
                        return;
                    }
                    if (longPolling) delete response.signature;
                    if (typeof error === 'object' || typeof behaviourResponse !== 'object') {

                        if (error) error.name = options.name;
                        if (error) error.version = options.version;
                        request.next(error || er || new Error('Error while executing ' +
                            options.name + ' behaviour, version ' + options.version + '!'));
                    } else if (!res_plugin ||
                        res_plugin(behaviourResponse, request.req, request.res, request.next)) {

                        response.response = options.paginate ? behaviourResponse.modelObjects ||
                            behaviourResponse : behaviourResponse;
                        if (options.paginate) {

                            response.has_more = paginate.hasNextPages(request.req)
                                (typeof behaviourResponse.pageCount === 'number' ?
                                    behaviourResponse.pageCount : 1);
                        }
                        if (typeof options.returns !== 'function') {

                            if (!setResponse(options.returns, !isRoute, request, response))
                                request.next();
                        } else options.returns(request.req, request.res, function (outputObjects) {

                            respond(request.res, outputObjects);
                        });
                    }
                };
                var fetching = typeof options.fetching === 'string' ? options.fetching : '';
                var FetchBehaviour = options.fetcher ? BehaviourConstructor :
                    FetchBehaviours[fetching];
                var cancel = businessController(typeof options.queue === 'function' ?
                    options.queue(options.name, inputObjects) : options.queue, options.database,
                    options.storage, options.fetcher || options.fetching, FetchBehaviour,
                    options.memory).runBehaviour(behaviour, options.paginate ?
                        function (property, superProperty) {

                            var page = {

                                modelObjects: 'modelObjects',
                                pageCount: 'pageCount'
                            };
                            return typeof options.map === 'function' ?
                                options.map(property, superProperty) ||
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
                                typeof suffix === 'string' ?
                                join(prefix, suffix) : suffix || prefix;
                        }), req, function (inputObjects) {

                            behaviour_runner(req, res, next, inputObjects);
                        });
                    else req.socket.on('end', req_handler.bind(null, req, res, next));
                } else options.parameters(req, res, function (inputObjects, er) {

                    if (req.complete) behaviour_runner(req, res, next, inputObjects, er);
                    else throw new Error('Parameters callback function called before all ' +
                        'request data consumed');
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
                            var route = typeof prefix === 'string' &&
                                request.path.startsWith(prefix) &&
                                typeof suffix === 'string' ?
                                join(prefix, suffix) : suffix || prefix;
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
                if (req_plugin) router(options.path, req_plugin, req_handler);
                else router(options.path, req_handler);
                behaviours[options.name] = {

                    version: options.version,
                    method: options.method,
                    path: options.path,
                    parameters: options.parameters,
                    returns: options.returns
                };
            } else if (isRouterMiddleware) {

                var route = typeof prefix === 'string' && prefix.length > 0 ?
                    join(prefix, options.path) : options.path;
                if (req_plugin) app.use(route, req_plugin, req_handler);
                else app.use(route, req_handler);
            } else {

                if (req_plugin) app.use(req_plugin, req_handler);
                else app.use(req_handler);
            }
        }
        return BehaviourConstructor;
    };
};

backend.behaviours = function (path, parser, remotes) {

    if (typeof remotes === 'object') defaultRemotes = remotes;
    if (defaultPrefix === '/' && typeof path === 'string' && path.length > 0)
        defaultPrefix = path;
    var prefix = path || defaultPrefix;
    app.get(typeof prefix === 'string' ? join(prefix, '/behaviours') : '/behaviours',
        function (req, res) {

            respond(res, behaviours, parser);
        });
    return behaviours;
};

backend.routes = behaviours;