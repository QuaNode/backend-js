/*jslint node: true */
/*jshint esversion: 6 */
"use strict";

var fs = require("fs");
var { URLSearchParams } = require("url");
var bodyParser = require("body-parser");
var logger = require("morgan");
var HttpStatus = require("http-status-codes");
var rateLimit = require("express-rate-limit");
var session = require("express-session");
var memorystore = require("memorystore");
var debug = require("debug");
var cors = require("cors");
var { Server } = require("socket.io");
var {
    BehavioursServer,
    compare,
    resolve,
    serve,
    app,
    routes,
    behaviour
} = require("./src/behaviour.js");
var {
    ModelEntity,
    QueryExpression,
    setComparisonOperators,
    setLogicalOperators,
    AggregateExpression,
    setComputationOperators,
    setModelController,
    getModelController,
    model
} = require("./src/model.js");
var {
    ServiceParameter,
    ServiceParameterType,
    service
} = require("./src/service.js");
var {
    setResourceController,
    getResourceController
} = require("./src/resource.js");
var {
    setCorsOptions,
    respond
} = require("./src/utils.js");

var LIMIT = 5;
var HITS = 30;
var TIMEOUT = 1000;
var WINDOW = HITS * TIMEOUT;
var MAX = LIMIT * HITS;
var limited = {};
var limiter = rateLimit({

    windowMs: WINDOW,
    max: MAX,
    delayMs: 0,
    headers: false,
    handler(req, res, next) {

        if (!limited[req.ip]) {

            limited[req.ip] = {

                count: 0,
                time: new Date().getTime()
            };
        }
        var time = new Date().getTime();
        time -= limited[req.ip].time;
        var resetting = time > WINDOW;
        var count = ++limited[req.ip].count;
        if (resetting) {

            limited[req.ip] = undefined;
            delete limited[req.ip];
        }
        var timeout = count / MAX * TIMEOUT;
        var limitable = count > MAX;
        if (limitable || resetting) {

            var limiting = !!limitable;
            limiting &= time <= WINDOW;
            if (!limiting) {

                limiting |= timeout > WINDOW;
            }
            if (limiting) {

                return res.status(...[
                    this.statusCode
                ]).send(this.message);
            }
        }
        setTimeout(function () {

            let not_ended = !req.aborted;
            not_ended &= !res.headersSent;
            if (not_ended) next();
        }, timeout);
    }
});

debug.enable("backend:*");
debug = debug("backend:index");

var server;

module.exports = {

    ModelEntity,
    QueryExpression,
    setComparisonOperators,
    setLogicalOperators,
    AggregateExpression,
    setComputationOperators,
    setModelController,
    getModelController,
    ServiceParameter,
    ServiceParameterType,
    setResourceController,
    getResourceController,
    model,
    service,
    behaviour,
    server(paths, options) {

        if (server) return server;
        app.disable("x-powered-by");
        if (options.proxy) {

            app.set(...[
                "trust proxy",
                options.proxy
            ]);
        }
        app.use(logger("dev"));
        app.use(limiter);
        var corsDelegate = function () {

            let [
                req,
                callback
            ] = arguments;
            var corsOptions = {

                origin: false,
                credentials: true
            };
            var maxAge = options.maxAge;
            var keys = Object.keys(routes);
            let length = keys.length;
            for (var i = 0; i < length; i++) {

                var routeOptions = routes[
                    keys[i]
                ];
                var { prefix } = routeOptions;
                if (!prefix) {

                    prefix = options.path;
                }
                var method;
                var {
                    method: rM
                } = routeOptions;
                let _ = typeof rM;
                var valid = _ === "string";
                if (valid) {

                    rM = rM.toLowerCase();
                    _ = typeof app[rM];
                    valid &= _ === "function";
                }
                if (valid) method = rM;
                var { origins } = routeOptions;
                if (origins === undefined) {

                    ({ origins } = options);
                }
                _ = typeof origins;
                var allow = _ !== "string";
                if (!allow) {

                    allow |= origins.length === 0;
                }
                if (allow) {

                    origins = origins === true;
                }
                var query, path = req.path;
                if (!path) {

                    path = req.originalUrl;
                }
                if (!path) path = req.url;
                ([
                    path,
                    query
                ] = path.split("?"));
                var events_path = false;
                let eventful = !!query;
                eventful &= !!routeOptions.events;
                rM = req.method.toLowerCase();
                if (eventful && compare({

                    path: resolve(...[
                        prefix,
                        "/events",
                        path
                    ])
                }, {

                    path
                }) && rM === "get") {

                    query = new URLSearchParams(...[
                        query
                    ]).toString();
                    if (keys[i] == query.behaviour) {

                        events_path = true;
                    }
                }
                var cors_ready = !!origins;
                if (cors_ready) {

                    cors_ready = events_path;
                    if (!cors_ready) {

                        cors_ready = compare({

                            path: resolve(...[
                                prefix,
                                routeOptions.path,
                                path
                            ])
                        }, {

                            path
                        });
                        cors_ready &= [
                            method,
                            "options"
                        ].indexOf(rM) > -1;
                    }
                }
                if (cors_ready) {

                    setCorsOptions(...[
                        corsOptions,
                        origins,
                        routeOptions,
                        req
                    ]);
                    let {
                        maxAge: mA
                    } = routeOptions
                    if (mA != undefined) {

                        maxAge = mA;
                    }
                    break;
                }
            }
            if (!isNaN(parseInt(maxAge))) {

                corsOptions.maxAge = maxAge;
            }
            callback(null, corsOptions);
        };
        app.all("/*", cors(corsDelegate));
        var { parser, format } = options;
        let __ = typeof format;
        var parsing = __ === "string";
        if (!parsing) {

            __ = typeof parser;
            parsing = __ === "string";
            if (parsing) format = parser;
        }
        if (!parsing) {

            __ = typeof parser;
            parsing = __ === "object";
            if (parsing) {

                ({ format } = parser);
                __ = typeof format;
                parsing = __ === "string";
            }
        }
        if (!parsing) format = undefined;
        var {
            upgrade,
            validate,
            connect
        } = new BehavioursServer(...[
            options.path,
            format,
            paths,
            options.operations
        ]);
        var proxied = typeof paths === "object";
        if (proxied) {

            let _ = typeof paths.proxy;
            proxied &= _ === "string";
            if (proxied) {

                proxied &= paths.proxy.length > 0;
            }
        }
        if (proxied) require(paths.proxy);
        if (typeof options.static === "object") {

            let _ = typeof options.static.route;
            if (_ === "string") {

                app.use(...[
                    options.static.route,
                    serve(...[
                        options.static.path,
                        options.static
                    ])
                ]);
            } else app.use(serve(...[
                options.static.path,
                options.static
            ]));
        }
        app.use(session = session(function () {

            var { cookie } = options;
            if (typeof cookie !== 'object') {

                cookie = {};
            }
            var store;
            if (!cookie || !cookie.store) {

                var MemoryStore = memorystore(...[
                    session
                ]);
                store = new MemoryStore();
            }
            return Object.assign({

                name: "behaviours.sid",
                secret: "" + new Date().getTime(),
                resave: false,
                saveUninitialized: true,
                store
            }, cookie);
        }()));
        var parserOptions = parser;
        __ = typeof parserOptions;
        if (__ !== "object") {

            ({ parserOptions } = options);
        }
        __ = typeof parserOptions;
        if (__ !== "object") {

            parserOptions = undefined;
        }
        if (!parserOptions) {

            parserOptions = undefined;
        }
        if (parsing) {

            __ = typeof bodyParser[format];
            if (__ === "function") {

                parser = bodyParser[format](...[
                    parserOptions
                ]);
            }
        } else {

            __ = typeof parser;
            if (__ !== "function") {

                parser = bodyParser.json(...[
                    parserOptions
                ]);
            }
        }
        __ = typeof parser;
        if (__ === "function") {

            app.use(parser);
        }
        __ = typeof paths;
        var requiring = __ === "string";
        if (requiring) {

            requiring &= paths.length > 0;
        }
        if (requiring) require(paths);
        else {

            requiring = __ === "object";
            if (requiring) {

                __ = typeof paths.local;
                requiring &= __ === "string";
                if (requiring) {

                    let {
                        length
                    } = paths.local;
                    requiring &= length > 0;
                }
            }
            if (requiring) {

                require(paths.local);
            }
        }
        app.use(function (req, res, next) {

            var err = new Error("Not found");
            if (/[A-Z]/.test(req.path)) {

                err = new Error("Not " +
                    "found, maybe the " +
                    "case-sensitivity of " +
                    "the path");
            }
            err.code = 404;
            next(err);
        });
        app.use(function (err, req, res, next) {

            debug(err);
            if (res.headersSent) {

                return next(err);
            }
            respond(res.status(...[
                HttpStatus.getStatus(...[
                    err.code
                ]) || 500
            ]), {

                behaviour: err.name,
                version: err.version,
                message: err.message
            }, format);
        });
        __ = typeof options.https;
        var https = __ === "object";
        var port = options.port;
        if (!port) port = process.env.PORT;
        if (!port) port = https ? 443 : 80;
        app.set("port", port);
        var protocol = https ? "https" : "http";
        server = require(...[
            protocol
        ]).createServer(function () {

            if (https) return [
                "key",
                "cert",
                "ca"
            ].reduce(function (https, prop) {

                var path = options.https[prop];
                __ = typeof path;
                var existed = __ === "string";
                existed &= fs.existsSync(path);
                if (existed) {

                    https[
                        prop
                    ] = fs.readFileSync(...[
                        path
                    ]).toString();
                }
                return https;
            }, {}); else return app;
        }(), app);
        var io = new Server(server, function () {

            var { websocket } = options;
            if (typeof websocket !== 'object') {

                websocket = {};
            }
            return Object.assign({

                cors: corsDelegate,
                allowEIO3: true
            }, websocket);
        }());
        io.of(function (path, query, next) {

            var err = validate(path, query);
            next(err, !err);
        }).on("connect", function (socket) {

            socket.once(...[
                "disconnect",
                function () {

                    debug("backend " +
                        "socket:" + socket.id +
                        " disconnected on port " +
                        app.get("port"));
                }
            ]);
            connect(socket);
        }).use(function (socket, next) {

            session(socket.handshake, {}, next);
        });
        server.removeAllListeners("upgrade");
        server.on("upgrade", function () {

            let [
                req,
                socket,
                head
            ] = arguments;
            if (!upgrade(req, socket, head)) {

                io.engine.handleUpgrade(...[
                    req,
                    socket,
                    head
                ]);
            }
        });
        server.listen(...[
            app.get("port"),
            function () {

                debug("backend listening on port " +
                    app.get("port"));
            }
        ]);
        return server;
    },
    app(paths, options) {

        if (server) return app;
        this.server(paths, options);
        return app;
    }
};
