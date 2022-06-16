/*jslint node: true */
/*jshint esversion: 6 */
'use strict';

var express = require('express');
var paginate = require('express-paginate');
var Route = require('route-parser');
var {
    unless
} = require('express-unless');
var vhost = require('vhost');
var define = require('define-js');
var parse = require('parseparams');
var url = require('url');
var querystring = require('querystring');
var crypto = require('crypto');
var {
    BusinessBehaviourType,
    BusinessBehaviour
} = require('behaviours-js');
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

var join = backend.join = function (s1, s2) {

    var fromIndex = s2.startsWith('/') ? 1 : 0;
    var toIndex = s1.endsWith('/') ? s1.length - 1 : s1.length;
    return url.resolve(s1.substr(0, toIndex) + '/', s2.substr(fromIndex));
};

var compare = backend.compare = function (route1, route2) {

    var route;
    if (route1 && route1.path && (route1.path.indexOf(':') > -1 ||
        route1.path.indexOf('*') > -1)) route = route1;
    else route = route2;
    if (route === route2) {

        route2 = route1;
        route1 = route;
    }
    if (route && route.path) route = new Route(route.path);
    var path1 = route1 && route1.path;
    var path2 = route2 && route2.path;
    var method1 = ((route1 && route1.method) || '').toLowerCase();
    var method2 = ((route2 && route2.method) || '').toLowerCase();
    var matched = route && route.match(path2 || ' ');
    return (matched || path1 === path2) && method1 === method2;
};

var resolve = backend.resolve = function (prefix, suffix, path) {

    var prefixed = typeof prefix === 'string' && path.startsWith(prefix);
    if (prefixed && typeof suffix === 'string') return join(prefix, suffix);
    else return suffix || prefix;
};

var defaultPrefix = '/';

var types = {

    database: BusinessBehaviourType.OFFLINESYNC,
    database_with_action: BusinessBehaviourType.OFFLINEACTION,
    integration: BusinessBehaviourType.ONLINESYNC,
    integration_with_action: BusinessBehaviourType.ONLINEACTION
};

var routers = {};

var events = {};

var emitters = {};

var behaviours = {

    behaviours: {

        method: 'GET',
        path: '/behaviours'
    }
};

var BEHAVIOURS = {};

var defaultOperations = {};

var defaultRemotes = {};

var FetchBehaviours = {};

var LogBehaviours = {};

var upgradePlugins = {};

backend.behaviour = function (path, config) {

    if (typeof app !== 'function' || typeof app.use !== 'function') {

        throw new Error('Invalid express app');
    }
    if (typeof path === 'object') {

        config = path;
        path = config.path;
    }
    if (typeof config !== 'object' || !config) {

        config = {};
    }
    if (typeof config.operations !== 'object' || !config.operations) {

        config.operations = {};
    }
    return function (options, getConstructor) {

        if (typeof options !== 'object') {

            throw new Error('Invalid definition object');
        }
        if (typeof options.inherits === 'function') {

            if (!(options.inherits.prototype instanceof BusinessBehaviour)) {

                throw new Error('Super behaviour should inherit from BusinessBehaviour');
            }
            options = Object.assign(Object.keys(BEHAVIOURS).reduce(function (ȯptions, name) {

                if (BEHAVIOURS[name].constructor == options.inherits)
                    return BEHAVIOURS[name].options;
                return ȯptions;
            }, {}), options);
        }
        if (typeof options.operations !== 'object' || !options.operations) {

            options.operations = {};
        }
        options.operations =
            Object.assign({}, defaultOperations, config.operations, options.operations);
        if (typeof options.type !== 'string' || types[options.type] === undefined) {

            options.type = 'database';
        }
        if (typeof options.version !== 'string' || options.version.length === 0) {

            throw new Error('Invalid behaviour version');
        }
        if (typeof getConstructor !== 'function') {

            throw new Error('Invalid constructor');
        }
        if (!Array.isArray(options.events)) options.events = [];
        if (typeof options.event === 'function') options.events.push(options.event);
        options.events = options.events.filter(function (event) {

            return typeof event === 'function' || (typeof event === 'string' &&
                event.length > 0);
        });
        var hasName = typeof options.name === 'string' && options.name.length > 0;
        var hasUniqueName = function () {

            if (hasName && BEHAVIOURS[options.name] && config.skipSameRoutes !== true)
                throw new Error('Duplicate behavior name: ' + options.name +
                    '. Make sure names are unique and not numerical');
            return hasName && !BEHAVIOURS[options.name];
        }();
        var BehaviourConstructor = define(getConstructor).extend(getLogBehaviour(options, config,
            types, BEHAVIOURS, defaultRemotes, FetchBehaviours, LogBehaviours, function (room) {

                return emitters[room];
            })).defaults({

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
        if (hasUniqueName) {

            if (options.name === 'behaviours') {

                throw new Error('behaviours is a reserved name');
            }
            var isRouterMiddleware =
                typeof options.path === 'string' && options.path.length > 0;
            var isRoute = isRouterMiddleware && typeof options.method === 'string' &&
                typeof app[options.method.toLowerCase()] === 'function';
            var longPolling = isRoute && Object.keys(types).indexOf(options.type) > 1;
            if (!Array.isArray(options.plugins)) options.plugins = [];
            if (typeof options.plugin === 'function') options.plugins.push(options.plugin);
            var req_plugin = options.plugins.reduce(function (req_plugin, plugin) {

                if (typeof plugin === 'function' && parse(plugin)[0] !== 'out') return plugin;
                return req_plugin;
            }, undefined);
            if (req_plugin && parse(req_plugin).reverse()[0] === 'head')
                upgradePlugins[options.name] = req_plugin;
            var res_plugin = options.plugins.reduce(function (res_plugin, plugin) {

                if (typeof plugin === 'function' && parse(plugin)[0] === 'out') return plugin;
                return res_plugin;
            }, undefined);
            var prefix;
            if (typeof path === 'string' && path.length > 0) {

                if (config.overwritePath) prefix = path;
                else prefix = join(defaultPrefix, path);
            } else if (defaultPrefix !== '/' && !config.overwritePath) prefix = defaultPrefix;
            if (options.events.length > 0 &&
                join(prefix, options.path) == join(prefix, '/events')) {

                throw new Error('Invalid path. ' + join(prefix, options.path) +
                    ' is reserved route');
            }
            BEHAVIOURS[options.name] = {

                options: Object.assign({ prefix }, options),
                constructor: BehaviourConstructor
            };
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
                }, function (name, room) {

                    var event = events[name];
                    if (event && event[room]) {

                        var client = event[room][req.session.id];
                        if (client) return client.id;
                    }
                });
                var behaviour_callback = function (behaviour_response, error) {

                    var request = getRequest(req, res, next, response);
                    if (!request) {

                        if (longPolling) setResponse(behaviour_callback.bind(null,
                            behaviour_response, error), response);
                        return;
                    }
                    if (longPolling) delete response.signature;
                    if (typeof error === 'object' || typeof behaviour_response !== 'object') {

                        if (error) error.name = options.name;
                        if (error) error.version = options.version;
                        request.next(error || er || new Error('Error while executing ' +
                            options.name + ' behaviour, version ' + options.version + '!'));
                    } else if (!res_plugin ||
                        !res_plugin(behaviour_response, request.req, request.res, request.next)) {

                        response.response = options.paginate ? behaviour_response.modelObjects ||
                            behaviour_response : behaviour_response;
                        if (options.events.length > 0) {

                            var events_token = crypto.randomBytes(48).toString('base64');
                            response.events_token = events_token;
                            response.events = options.events.map(function (event) {

                                var room = typeof event === 'function' ?
                                    event(options.name, inputObjects) : event;
                                return room && typeof room === 'object' ?
                                    JSON.stringify(room) : room;
                            }).filter(function (room) {

                                if (typeof room === 'string' && room.trim()) {

                                    var event = events[options.name];
                                    if (!event) event = events[options.name] = {};
                                    if (!event[room]) event[room] = {};
                                    event[room][req.session.id] = {

                                        token: events_token,
                                        count: 0
                                    };
                                    return true;
                                }
                                return false;
                            });
                        }
                        if (options.paginate) {

                            response.has_more = paginate.hasNextPages(request.req)
                                (typeof behaviour_response.pageCount === 'number' ?
                                    behaviour_response.pageCount : 1);
                        }
                        if (typeof options.returns !== 'function') {

                            if (!setResponse(options.returns, !isRoute, request, response))
                                request.next();
                        } else options.returns(request.req, request.res, behaviour_response,
                            error, function (outputObjects) {

                                respond(request.res, outputObjects);
                            });
                    }
                };
                var fetching = typeof options.fetching === 'string' ? options.fetching : '';
                var FetchBehaviour =
                    options.fetcher ? BehaviourConstructor : FetchBehaviours[fetching];
                var cancel = businessController(options.name, typeof options.queue === 'function' ?
                    options.queue(options.name, inputObjects) : options.queue, options.database,
                    options.storage, options.fetcher || options.fetching, FetchBehaviour,
                    options.memory, options.operations).runBehaviour(behaviour, options.paginate ?
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
                            return resolve(prefix, suffix, req.path);
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

                    custom: function (req) {

                        return options.unless.filter(function (name) {

                            var suffix = behaviours[name] && behaviours[name].path;
                            var method = behaviours[name] && behaviours[name].method;
                            return compare({

                                path: resolve(prefix, suffix, req.path),
                                method: method
                            }, {

                                path: req.path,
                                method: req.method
                            });
                        }).length > 0;
                    }
                });
            }
            if (typeof options.host === 'string' && options.host.length > 0) {

                req_handler = vhost(options.host, req_handler);
                if (req_plugin) req_plugin = vhost(options.host, req_plugin);
            } else if (req_plugin) {

                var _req_plugin_ = req_plugin;
                req_plugin = function (req, res, next) {

                    _req_plugin_(req, res, next);
                };
            }
            if (isRoute) {

                var names = Object.keys(behaviours);
                if (!config.skipSameRoutes && names.some(function (name) {

                    return compare({

                        path: behaviours[name].path,
                        method: behaviours[name].method
                    }, {

                        path: options.path,
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
                    host: options.host,
                    events: options.events.length > 0,
                    prefix: prefix,
                    origins: options.origins,
                    maxAge: options.maxAge,
                    parameters: function () {

                        if (typeof options.parameters !== 'function')
                            return options.parameters;
                    }(),
                    returns: function () {

                        if (typeof options.returns !== 'function')
                            return options.returns;
                    }()
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
        } else BEHAVIOURS[Object.keys(BEHAVIOURS).length + 1] = {

            options: options,
            constructor: BehaviourConstructor
        };
        return BehaviourConstructor;
    };
};

backend.BehavioursServer = function (path, parser, remotes, operations) {

    if (operations && typeof operations === 'object') defaultOperations = operations;
    if (remotes && typeof remotes === 'object') defaultRemotes = remotes;
    if (defaultPrefix === '/' && typeof path === 'string' && path.length > 0)
        defaultPrefix = path;
    var prefix = path || defaultPrefix;
    app.get(typeof prefix === 'string' ? join(prefix, '/behaviours') : '/behaviours',
        function (req, res) {

            respond(res, behaviours, parser);
        });
    var validate_path = function (behaviour, path) {

        var behaviour_prefix = behaviour.prefix || defaultPrefix;
        var behaviour_path = behaviour.path || '/';
        var isRoute = typeof behaviour.method === 'string' &&
            typeof app[behaviour.method.toLowerCase()] === 'function';
        if (!isRoute) behaviour_path = join(behaviour_path, '/*path');
        return compare({

            path: resolve(behaviour_prefix, behaviour_path, path)
        }, {

            path: path
        });
    };
    var validate_host = function (host, req, res) {

        var same_host = true;
        if (typeof host === 'string' && host.length > 0)
            vhost(host, function () { })(req, res, function () {

                same_host = false;
            });
        return same_host;
    };
    this.upgrade = function (req, socket, head) {

        var names = Object.keys(BEHAVIOURS);
        var [path, query] = (req.originalUrl || req.url).split('?');
        if (query) {

            query = querystring.parse(query);
            if (names.indexOf(query.behaviour) > -1) names = [query.behaviour];
        }
        for (var i = 0; i < names.length; i++) {

            if (!upgradePlugins[names[i]]) continue;
            var behaviour = BEHAVIOURS[names[i]].options;
            if (validate_host(behaviour.host, req, socket) &&
                validate_path(behaviour, path)) {

                upgradePlugins[names[i]](req, socket, undefined, head);
                return true;
            }
        }
        return false;
    };
    this.validate = function (path, query) {

        var name = query.behaviour;
        if (typeof name === 'string' && name.length > 0) {

            var behaviour = BEHAVIOURS[name] && BEHAVIOURS[name].options;
            if (behaviour && behaviour.events && compare({

                path: resolve(behaviour.prefix, '/events', path)
            }, {

                path: path
            })) return;
        }
        return new Error('Not found');
    };
    this.connect = function (socket) {

        var client;
        var name = socket.handshake.auth.behaviour ||
            socket.handshake.query.behaviour;
        var token = socket.handshake.auth.token ||
            socket.handshake.query.token;
        var id = socket.handshake.session.id;
        if (typeof name === 'string' && name.length > 0 &&
            typeof token === 'string' && token.length > 0) {

            var behaviour = BEHAVIOURS[name] && BEHAVIOURS[name].options;
            if (behaviour && behaviour.events &&
                validate_host(behaviour.host, socket.request, socket)) {

                var joined = false;
                var event = events[name];
                if (event) socket.once('join ' + name, function (room) {

                    if (event[room]) client = event[room][id];
                    if (client) {

                        client.id = socket.id;
                        client.count++;
                        if (client.token === token && client.count === 1) {

                            var room_events = emitters[room];
                            if (!room_events) room_events = emitters[room] = {};
                            var emitter = room_events[name];
                            if (!emitter) emitter = room_events[name] = [];
                            if (emitter.indexOf(socket.nsp) === -1)
                                emitter.push(socket.nsp);
                            socket.join(room);
                            joined = true;
                            return;
                        }
                    }
                    socket.disconnect(true);
                });
                setTimeout(function () {

                    if (!joined) socket.disconnect(true);
                }, 60000);
                socket.once('disconnect', function () {

                    if (client) client.count--;
                });
                return;
            }
        }
        socket.disconnect(true);
    };
};

backend.routes = behaviours;
