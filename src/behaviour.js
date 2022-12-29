/*jslint node: true */
/*jshint esversion: 6 */
"use strict";

var express = require("express");
var paginate = require("express-paginate");
var Route = require("route-parser");
var debug = require("debug");
var {
    unless
} = require("express-unless");
var vhost = require("vhost");
var define = require("define-js");
var parse = require("parseparams");
var {
    URL,
    URLSearchParams
} = require("url");
var crypto = require("crypto");
var {
    BusinessBehaviourType,
    BusinessBehaviour
} = require("behaviours-js");
var {
    OFFLINESYNC,
    OFFLINEACTION,
    ONLINESYNC,
    ONLINEACTION
} = BusinessBehaviourType;
var {
    businessController
} = require("./controller.js");
var {
    getLogBehaviour
} = require("./log.js");
var {
    scheduleBehaviour
} = require("./schedule.js");
var {
    getInputObjects,
    setResponse,
    respond,
    getSignature,
    setSignature,
    getRequest
} = require("./utils.js");

debug.enable("backend:*");
debug = debug("backend:behaviour");

var backend = module.exports;

var app = backend.app = express();

backend.serve = express.static;

var join = backend.join = function (s1, s2) {

    var fromIndex = s2.startsWith("/") ? 1 : 0;
    var toIndex = s1.length;
    if (s1.endsWith("/")) toIndex--;
    s1 = s1.substr(0, toIndex) + "/";
    s2 = s2.substr(fromIndex);
    var url = new URL(...[
        s2,
        new URL(s1, "resolve://")
    ]);
    if (url.protocol === "resolve:") {

        var { pathname, search, hash } = url;
        return pathname + search + hash;
    }
    return url.toString();
};

var compare = backend.compare = function () {

    var [route1, route2] = arguments;
    var route = route2;
    var varying = !!(route1 && route1.path);
    if (varying) {

        varying = route1.path.indexOf(":") > -1;
        varying |= route1.path.indexOf("*") > -1;
    }
    if (varying) route = route1;
    if (route === route2) {

        route2 = route1;
        route1 = route;
    }
    if (route && route.path) {

        route = new Route(route.path);
    }
    var path1 = route1 && route1.path;
    var path2 = route2 && route2.path;
    var method1 = (route1 && route1.method) || "";
    method1 = method1.toLowerCase();
    var method2 = (route2 && route2.method) || "";
    method2 = method2.toLowerCase();
    var matched = !!route;
    if (matched) {

        matched &= !!route.match(path2 || " ");
    }
    matched |= path1 === path2;
    matched &= method1 === method2;
    return matched;
};

var resolve = backend.resolve = function () {

    var [prefix, suffix, path] = arguments;
    var prefixed = typeof prefix === "string";
    if (prefixed) {

        prefixed &= path.startsWith(prefix);
    }
    if (prefixed && typeof suffix === "string") {

        return join(prefix, suffix);
    } else return suffix || prefix;
};

var defaultPrefix = "/";

var types = {

    database: OFFLINESYNC,
    database_with_action: OFFLINEACTION,
    integration: ONLINESYNC,
    integration_with_action: ONLINEACTION
};

var routers = {};

var events = {};

var emitters = {};

var behaviours = {

    behaviours: {

        method: "GET",
        path: "/behaviours"
    }
};

var BEHAVIOURS = {};

var defaultOperations = {};

var defaultRemotes = {};

var FetchBehaviours = {};

var LogBehaviours = {};

var upgradePlugins = {};

backend.behaviour = function (path, config) {

    var no_app = typeof app !== "function";
    if (!no_app) {

        no_app |= typeof app.use !== "function";
    }
    if (no_app) throw new Error("Invalid express app");
    if (typeof path === "object") {

        config = path;
        path = config.path;
    }
    if (typeof config !== "object" || !config) {

        config = {};
    }
    var no_operations = !config.operations;
    if (!no_operations) {

        let { operations } = config;
        no_operations |= typeof operations !== "object";
    }
    if (no_operations) config.operations = {};
    return function (options, getConstructor) {

        if (typeof options !== "object") {

            throw new Error("Invalid definition object");
        }
        if (typeof options.inherits === "function") {

            let { prototype } = options.inherits;
            if (!(prototype instanceof BusinessBehaviour)) {

                throw new Error("Super behaviour should " +
                    "inherit from BusinessBehaviour");
            }
            options = Object.assign(Object.keys(...[
                BEHAVIOURS
            ]).reduce(function (ȯptions, name) {

                let { constructor } = BEHAVIOURS[name];
                if (constructor == options.inherits) {

                    return BEHAVIOURS[name].options;
                }
                return ȯptions;
            }, {}), options);
        }
        no_operations = !options.operations;
        if (!no_operations) {

            let { operations } = options;
            no_operations |= typeof operations !== "object";
        }
        if (no_operations) options.operations = {};
        options.operations = Object.assign(...[
            {},
            defaultOperations,
            config.operations,
            options.operations
        ]);
        var no_type = typeof options.type !== "string";
        if (!no_type) {

            no_type |= types[options.type] === undefined;
        }
        if (no_type) options.type = "database";
        var no_version = typeof options.version !== "string";
        if (!no_version) {

            no_version |= options.version.length === 0;
        }
        if (no_version) {

            throw new Error("Invalid behaviour version");
        }
        if (typeof getConstructor !== "function") {

            throw new Error("Invalid constructor");
        }
        if (!Array.isArray(options.events)) {

            options.events = [];
        }
        if (typeof options.event === "function") {

            options.events.push(options.event);
        }
        options.events = options.events.filter(...[
            function (event) {

                let valid = typeof event === "function";
                if (!valid) {

                    valid = typeof event === "string";
                    if (valid) {

                        valid &= event.length > 0;
                    }
                }
                return valid;
            }
        ]);
        var named = typeof options.name === "string";
        if (named) {

            named &= options.name.length > 0;
        }
        var uniquelyNamed = function () {

            let { skipSameRoutes } = config;
            if (named && BEHAVIOURS[
                options.name
            ] && skipSameRoutes !== true) {

                throw new Error("Duplicate behavior name: " +
                    options.name + ". Make sure names are " +
                    "unique and not numerical");
            }
            return named && !BEHAVIOURS[options.name];
        }();
        var BehaviourConstructor = define(...[
            getConstructor
        ]).extend(getLogBehaviour(...[
            options,
            config,
            types,
            BEHAVIOURS,
            defaultRemotes,
            FetchBehaviours,
            LogBehaviours,
            function (room) {

                return emitters[room];
            }
        ])).defaults({

            type: types[options.type]
        });
        if (options.fetcher) {

            var fetcher = "";
            if (typeof options.fetcher === "string") {

                fetcher = options.fetcher;
            }
            FetchBehaviours[fetcher] = BehaviourConstructor;
        }
        if (options.logger) {

            var logger = "";
            if (typeof options.logger === "string") {

                options.logger = logger;
            }
            LogBehaviours[logger] = BehaviourConstructor;
        }
        scheduleBehaviour(...[
            options,
            BehaviourConstructor,
            types,
            FetchBehaviours
        ]);
        if (uniquelyNamed) {

            if (options.name === "behaviours") {

                throw new Error("behaviours is a reserved name");
            }
            var middleware = typeof options.path === "string";
            if (middleware) {

                middleware &= options.path.length > 0;
            }
            var routing = middleware;
            routing &= typeof options.method === "string";
            if (routing) {

                let method = options.method.toLowerCase();
                routing &= typeof app[method] === "function";
            }
            var polling = routing && Object.keys(...[
                types
            ]).indexOf(options.type) > 1;
            if (!Array.isArray(options.plugins)) {

                options.plugins = [];
            }
            if (typeof options.plugin === "function") {

                options.plugins.push(options.plugin);
            }
            var request_plugins = options.plugins.filter(...[
                function (plugin) {

                    let valid = typeof plugin === "function";
                    if (valid) {

                        valid &= parse(plugin)[0] !== "out";
                    }
                    return valid;
                }
            ]);
            var upgradePlugin;
            var upgrading = request_plugins.length > 0;
            if (upgrading) {

                upgradePlugin = request_plugins.find(...[
                    function (plugin) {

                        let [last] = parse(plugin).reverse();
                        return last === "head";
                    }
                ]);
                upgrading &= !!upgradePlugin;
            }
            if (upgrading) {

                upgradePlugins[options.name] = upgradePlugin;
            }
            var response_plugin = options.plugins.reduce(...[
                function (response_plugin, plugin) {

                    let valid = typeof plugin === "function";
                    if (valid) {

                        valid &= parse(plugin)[0] === "out";
                    }
                    if (valid) return plugin;
                    return response_plugin;
                },
                undefined
            ]);
            var prefix;
            var pathing = typeof path === "string";
            if (pathing) {

                pathing &= path.length > 0;
            }
            if (pathing) {

                if (config.overwritePath) prefix = path;
                else prefix = join(defaultPrefix, path);
            } else {

                var no_overwrite = !config.overwritePath;
                no_overwrite &= defaultPrefix !== "/";
                if (no_overwrite) {

                    prefix = defaultPrefix;
                }
            }
            if (options.events.length > 0 && join(...[
                prefix,
                options.path
            ]) == join(prefix, "/events")) {

                throw new Error("Invalid path. " +
                    join(prefix, options.path) +
                    " is reserved route");
            }
            BEHAVIOURS[options.name] = {

                options: Object.assign({ prefix }, options),
                constructor: BehaviourConstructor
            };
            var behaviour_runner = function () {

                var [
                    req,
                    res,
                    next,
                    inputObjects,
                    er
                ] = arguments;
                var onClose;
                var signature = getSignature(req);
                var response = {

                    behaviour: options.name,
                    version: options.version
                };
                if (polling) {

                    let time = new Date(signature).getTime();
                    response.signature = time;
                    setSignature(req, res, next, response);
                    if (typeof signature === "number") return;
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
                    timeout: options.timeout,
                    inputObjects
                }, function (name, room) {

                    if (!req.session) return;
                    var event = events[name];
                    if (event && event[room]) {

                        let { id } = req.session;
                        let client = event[room][id];
                        if (client) return client.id;
                    }
                }, function () {

                    return req.complete;
                });
                var behaviour_callback = function () {

                    var [
                        result,
                        error
                    ] = arguments;
                    var request = getRequest(...[
                        req,
                        res,
                        next,
                        response
                    ]);
                    if (!request) {

                        if (polling) setResponse(...[
                            behaviour_callback.bind(...[
                                null,
                                result,
                                error
                            ]),
                            response
                        ]);
                        return;
                    }
                    if (polling) delete response.signature;
                    var failing = typeof error === "object";
                    failing |= typeof result !== "object";
                    if (failing) {

                        if (error && !error.name) {

                            error.name = options.name;
                        }
                        if (error && !error.version) {

                            error.version = options.version;
                        }
                        request.next(...[
                            error || er || new Error("Error " +
                                "while executing " +
                                options.name +
                                " behaviour, version " +
                                options.version + "!")
                        ]);
                    } else {

                        var responding = !response_plugin;
                        if (!responding) {

                            responding |= !response_plugin(...[
                                result,
                                request.req,
                                request.res,
                                request.next
                            ]);
                        }
                        if (responding) {

                            response.response = result;
                            if (options.paginate) {

                                let {
                                    modelObjects: page
                                } = result;
                                if (page) {

                                    response.response = page;
                                }
                            }
                            let { length } = options.events;
                            let eventful = length > 0;
                            eventful &= !!req.session;
                            if (eventful) {

                                let _ = crypto.randomBytes(48);
                                let token = _.toString("base64");
                                response.events_token = token;
                                ({ events: _ } = options);
                                response.events = _.map(...[
                                    function (event) {

                                        let room = event;
                                        _ = typeof event;
                                        if (_ === "function") {

                                            room = event(...[
                                                options.name,
                                                inputObjects
                                            ]);
                                        }
                                        let jsonify = !!room;
                                        _ = typeof room;
                                        jsonify &= _ === "object";
                                        if (jsonify) {

                                            let {
                                                stringify
                                            } = JSON;
                                            return stringify(room);
                                        }
                                        return room;
                                    }
                                ]).filter(function (room) {

                                    _ = typeof room;
                                    let valid = _ === "string";
                                    if (valid) {

                                        valid &= !!room.trim();
                                    }
                                    if (valid) {

                                        var event = events[
                                            options.name
                                        ];
                                        if (!event) {

                                            event = events[
                                                options.name
                                            ] = {};
                                        }
                                        if (!event[room]) {

                                            event[room] = {};
                                        }
                                        let { id } = req.session;
                                        event[room][id] = {

                                            token,
                                            date: new Date(),
                                            count: 0
                                        };
                                        return true;
                                    }
                                    return false;
                                });
                            }
                            if (options.paginate) {

                                let {
                                    pageCount: page
                                } = result;
                                if (typeof page !== "number") {

                                    page = 1;
                                }
                                let _ = paginate.hasNextPages(...[
                                    request.req
                                ])(page);
                                response.has_more = _;
                            }
                            let { returns } = options;
                            if (typeof returns !== "function") {

                                if (!setResponse(...[
                                    returns,
                                    !routing,
                                    request,
                                    response
                                ])) request.next();
                            } else returns(...[
                                request.req,
                                request.res,
                                result,
                                error,
                                function (outputObjects) {

                                    respond(...[
                                        request.res,
                                        outputObjects
                                    ]);
                                }
                            ]);
                        }
                    }
                    if (onClose) {

                        req.socket.removeListener(...[
                            "close", onClose
                        ]);
                    }
                };
                var fetching = "";
                if (typeof options.fetching === "string") {

                    fetching = options.fetching;
                }
                var FetchBehaviour = FetchBehaviours[fetching];
                if (options.fetcher) {

                    FetchBehaviour = BehaviourConstructor;
                }
                let { queue } = options;
                if (typeof queue === "function") {

                    queue = queue(options.name, inputObjects);
                }
                var cancel = businessController(...[
                    options.name,
                    queue,
                    options.database,
                    options.storage,
                    options.fetcher || options.fetching,
                    FetchBehaviour,
                    options.memory,
                    options.operations
                ]).runBehaviour(...[
                    behaviour,
                    options.paginate ? function () {

                        var [
                            property,
                            superProperty
                        ] = arguments;
                        let page = {

                            modelObjects: "modelObjects",
                            pageCount: "pageCount"
                        };
                        let map = { options };
                        if (typeof map === "function") {

                            var mapped = map(...[
                                property,
                                superProperty
                            ]);
                            if (mapped) return mapped;
                        }
                        return page[property];
                    } : options.map,
                    behaviour_callback
                ]);
                req.socket.on("close", onClose = function () {

                    let _ = typeof cancel;
                    var cancelling = _ === "function";
                    cancelling &= !polling;
                    if (cancelling) {

                        cancelling &= !req.readableEnded;
                        if (!cancelling) {

                            cancelling |= !res.writableEnded;
                        }
                    }
                    if (cancelling) {

                        cancel();
                        debug("Request aborted and " +
                            "behaviour cancelled");
                    }
                });
            };
            var request_handler = function (req, res, next) {

                if (typeof options.parameters !== "function") {

                    if (!routing || req.complete) {

                        getInputObjects(...[
                            options.parameters,
                            Object.keys(behaviours).map(...[
                                function (name) {

                                    let {
                                        [name]: ȯptions
                                    } = behaviours, suffix;
                                    if (ȯptions) {

                                        suffix = ȯptions.path;
                                    }
                                    return resolve(...[
                                        prefix,
                                        suffix,
                                        req.path
                                    ]);
                                }]
                            ),
                            req,
                            function (inputObjects) {

                                behaviour_runner(...[
                                    req,
                                    res,
                                    next,
                                    inputObjects
                                ]);
                            }
                        ]);
                    } else req.socket.on(...[
                        "end",
                        request_handler.bind(null, req, res, next)
                    ]);
                } else options.parameters(...[
                    req,
                    res,
                    function (inputObjects, er) {

                        if (req.complete) behaviour_runner(...[
                            req,
                            res,
                            next,
                            inputObjects,
                            er
                        ]); else throw new Error("Parameters" +
                            " callback function called before" +
                            " all request data consumed");
                    }
                ]);
            };
            let filtering = Array.isArray(options.unless);
            filtering |= Array.isArray(options.for);
            if (filtering) {

                request_handler.unless = unless;
                request_handler = request_handler.unless({

                    custom(req) {

                        var exceptions = [];
                        if (Array.isArray(options.for)) {

                            exceptions = options.for;
                        } else options.for = undefined;
                        if (Array.isArray(options.unless)) {

                            exceptions = options.unless;
                        } else options.unless = undefined;
                        exceptions = exceptions.filter(...[
                            function (name) {

                                let {
                                    [name]: ȯptions
                                } = behaviours, suffix, method;
                                if (ȯptions) {

                                    suffix = ȯptions.path;
                                    method = ȯptions.method;
                                }
                                return compare({

                                    path: resolve(...[
                                        prefix,
                                        suffix,
                                        req.path
                                    ]),
                                    method
                                }, {

                                    path: req.path,
                                    method: req.method
                                });
                            }
                        ]).length;
                        if (options.unless) {

                            return exceptions > 0;
                        }
                        return exceptions === 0;
                    }
                });
            }
            filtering = typeof options.host === "string";
            if (filtering) {

                filtering &= options.host.length > 0;
            }
            if (filtering) {

                request_handler = vhost(...[
                    options.host,
                    request_handler
                ]);
                let plugins = request_plugins;
                if (plugins.length > 0) {

                    request_plugins = plugins.map(...[
                        function (plugin) {

                            return vhost(...[
                                options.host, plugin
                            ]);
                        }
                    ]);
                }
            } else if (request_plugins.length > 0) {

                let plugins = request_plugins;
                request_plugins = plugins.map(...[
                    function (plugin) {

                        return function (req, res, next) {

                            plugin(req, res, next);
                        };
                    }
                ]);
            }
            if (routing) {

                var names = Object.keys(behaviours);
                let {
                    skipSameRoutes
                } = config;
                if (!skipSameRoutes && names.some(...[
                    function (name) {

                        let {
                            [name]: ȯptions
                        } = behaviours;
                        return compare({

                            path: ȯptions.path,
                            method: ȯptions.method
                        }, {

                            path: options.path,
                            method: options.method
                        });
                    }
                ])) {

                    throw new Error("Duplicated behavior" +
                        " path: " + options.path);
                }
                var router = app;
                let prefixing = typeof prefix === "string";
                if (prefixing) {

                    prefixing &= prefix.length > 0;
                }
                if (prefixing) {

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
                router = router[
                    options.method.toLowerCase()
                ].bind(router);
                if (request_plugins.length > 0) router(...[
                    options.path,
                    ...request_plugins,
                    request_handler
                ]); else router(options.path, request_handler);
                behaviours[options.name] = {

                    version: options.version,
                    method: options.method,
                    path: options.path,
                    host: options.host,
                    events: options.events.length > 0,
                    prefix,
                    origins: options.origins,
                    maxAge: options.maxAge,
                    parameters: function () {

                        let { parameters } = options;
                        if (typeof parameters !== "function") {

                            return parameters;
                        }
                    }(),
                    returns: function () {

                        let { returns } = options;
                        if (typeof returns !== "function") {

                            return returns;
                        }
                    }()
                };
            } else if (middleware) {

                var route = options.path;
                let prefixing = typeof prefix === "string";
                if (prefixing) {

                    prefixing &= prefix.length > 0;
                }
                if (prefixing) {

                    route = join(prefix, options.path);
                }
                if (request_plugins.length > 0) app.use(...[
                    route,
                    ...request_plugins,
                    request_handler
                ]); else app.use(route, request_handler);
            } else {

                if (request_plugins.length > 0) app.use(...[
                    ...request_plugins,
                    request_handler
                ]); else app.use(request_handler);
            }
        } else BEHAVIOURS[Object.keys(BEHAVIOURS).length + 1] = {

            options,
            constructor: BehaviourConstructor
        };
        return BehaviourConstructor;
    };
};

backend.BehavioursServer = function () {

    var [prefix, parser, remotes, operations] = arguments;
    if (operations && typeof operations === "object") {

        defaultOperations = operations;
    }
    if (remotes && typeof remotes === "object") {

        defaultRemotes = remotes;
    }
    var default_prefixing = defaultPrefix === "/";
    default_prefixing &= typeof prefix === "string";
    if (default_prefixing) {

        default_prefixing &= prefix.length > 0;
    }
    if (default_prefixing) defaultPrefix = prefix;
    if (!prefix) prefix = defaultPrefix;
    var prefixing = typeof prefix === "string";
    if (prefixing) {

        prefixing &= prefix.length > 0;
    }
    app.get(function () {

        if (prefixing) return join(prefix, "/behaviours");
        return "/behaviours";
    }(), function (_, res) {

        respond(res, behaviours, parser);
    });
    var validate_path = function (behaviour, path) {

        var behaviour_prefix = behaviour.prefix;
        if (!behaviour_prefix) {

            behaviour_prefix = defaultPrefix;
        }
        var behaviour_path = behaviour.path || "/";
        var routing = typeof behaviour.method === "string";
        if (routing) {

            let method = behaviour.method.toLowerCase();
            routing &= typeof app[method] === "function";
        }
        if (!routing) {

            behaviour_path = join(behaviour_path, "/*path");
        }
        return compare({

            path: resolve(...[
                behaviour_prefix,
                behaviour_path,
                path
            ])
        }, {

            path
        });
    };
    var validate_host = function (host, req, res) {

        var same_host = true;
        let filtering = typeof host === "string";
        if (filtering) {

            filtering &= host.length > 0;
        }
        if (filtering) vhost(host, function () { })(...[
            req,
            res,
            function () {

                same_host = false;
            }
        ]);
        return same_host;
    };
    this.upgrade = function (req, socket, head) {

        var names = Object.keys(BEHAVIOURS);
        var [
            path,
            query
        ] = (req.originalUrl || req.url).split("?");
        if (query) {

            query = new URLSearchParams(...[
                query
            ]).toString();
            if (names.indexOf(query.behaviour) > -1) {

                names = [query.behaviour];
            }
        }
        for (var i = 0; i < names.length; i++) {

            if (!upgradePlugins[names[i]]) continue;
            let behaviour = BEHAVIOURS[names[i]].options;
            var upgrading = validate_host(...[
                behaviour.host,
                req,
                socket
            ]);
            if (upgrading) {

                upgrading = validate_path(behaviour, path);
            }
            if (upgrading) {

                upgradePlugins[names[i]](...[
                    req,
                    socket,
                    undefined,
                    head
                ]);
                return true;
            }
        }
        return false;
    };
    this.validate = function (path, query) {

        var name = query.behaviour;
        var named = typeof name === "string";
        if (named) {

            named &= name.length > 0;
        }
        if (named) {

            let behaviour;
            if (BEHAVIOURS[name]) {

                behaviour = BEHAVIOURS[name].options;
            }
            let eventful = !!behaviour;
            if (eventful) {

                eventful &= !!behaviour.events;
            }
            if (eventful && compare({

                path: resolve(...[
                    behaviour.prefix,
                    "/events",
                    path
                ])
            }, {

                path
            })) return;
        }
        return new Error("Not found");
    };
    this.connect = function (socket) {

        let client;
        let name = socket.handshake.auth.behaviour;
        if (!name) {

            name = socket.handshake.query.behaviour;
        }
        let token = socket.handshake.auth.token;
        if (!token) {

            token = socket.handshake.query.token;
        }
        let id = (socket.handshake.session || {}).id;
        var authenticating = typeof name === "string";
        if (authenticating) {

            authenticating &= name.length > 0;
        }
        authenticating &= typeof token === "string";
        if (authenticating) {

            authenticating &= token.length > 0;
        }
        if (authenticating) {

            let behaviour;
            if (BEHAVIOURS[name]) {

                behaviour = BEHAVIOURS[name].options;
            }
            let eventful = !!behaviour;
            if (eventful) {

                eventful &= !!behaviour.events;
            }
            if (eventful && validate_host(...[
                behaviour.host,
                socket.request,
                socket
            ])) {

                var joined = false;
                var event = events[name];
                if (event) socket.on(...[
                    "join " + name,
                    function (room) {

                        if (event[room]) {

                            client = event[room][id];
                        }
                        if (client) {

                            if (client.id !== socket.id) {

                                client.count++;
                            }
                            var { date: dt } = client;
                            dt = dt.getTime();
                            dt = new Date().getTime() - dt;
                            var authenticated = dt < 60000;
                            if (client.token !== token) {

                                authenticated = false;
                            }
                            if (client.count !== 1) {

                                authenticated = false;
                            };
                            if (authenticated) {

                                var room_events = emitters[
                                    room
                                ];
                                if (!room_events) {

                                    room_events = emitters[
                                        room
                                    ] = {};
                                }
                                var ëmitters = room_events[
                                    name
                                ];
                                if (!ëmitters) {

                                    ëmitters = room_events[
                                        name
                                    ] = [];
                                }
                                if (!ëmitters.find(...[
                                    function () {

                                        var [{
                                            name: e_id
                                        }] = arguments;
                                        var {
                                            name: nsp_id
                                        } = socket.nsp;
                                        return e_id == nsp_id;
                                    }
                                ])) {

                                    ëmitters.push(socket.nsp);
                                }
                                if (client.id !== socket.id) {

                                    client.id = socket.id;
                                    socket.join(room);
                                    joined = true;
                                }
                            }
                            return;
                        }
                        socket.disconnect(true);
                    }
                ]);
                setTimeout(function () {

                    if (!joined) socket.disconnect(true);
                }, 60000);
                socket.once("disconnect", function () {

                    if (client) {

                        client.count--;
                        if (client.count === 0) {

                            client.date = new Date();
                        }
                    }
                });
                return;
            }
        }
        socket.disconnect(true);
    };
};

backend.routes = behaviours;
