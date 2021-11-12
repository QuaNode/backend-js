/*jslint node: true */
/*jshint esversion: 6 */
'use strict';

var fs = require('fs');
var querystring = require('querystring');
var bodyParser = require('body-parser');
var logger = require('morgan');
var HttpStatus = require('http-status-codes');
var rateLimit = require("express-rate-limit");
var session = require('express-session');
var memorystore = require('memorystore');
var debug = require('debug');
var cors = require('cors');
var Server = require('socket.io').Server;
var {
    BehavioursServer,
    compare,
    resolve,
    serve,
    app,
    routes,
    behaviour
} = require('./src/behaviour.js');
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
} = require('./src/model.js');
var {
    ServiceParameter,
    ServiceParameterType,
    service
} = require('./src/service.js');
var {
    setResourceController,
    getResourceController
} = require('./src/resource.js');
var {
    setCorsOptions,
    respond
} = require('./src/utils.js');

var MemoryStore = memorystore(session);
var TIMEOUT = 50;
var limiter = rateLimit({

    windowMs: 200,
    max: 1,
    headers: false,
    handler: function (req, res, next) {

        var timeout = (req.rateLimit.resetTime.getTime() - new Date().getTime()) *
            (req.rateLimit.current - req.rateLimit.limit);
        if (timeout < (1000 * TIMEOUT)) setTimeout(function () {

            if (!req.aborted && !res.headersSent) next();
        }, timeout); else res.status(this.statusCode).send(this.message);
    }
});

debug.enable('backend:*');
debug = debug('backend:index');

var server;

module.exports = {

    ModelEntity: ModelEntity,
    QueryExpression: QueryExpression,
    setComparisonOperators: setComparisonOperators,
    setLogicalOperators: setLogicalOperators,
    AggregateExpression: AggregateExpression,
    setComputationOperators: setComputationOperators,
    setModelController: setModelController,
    getModelController: getModelController,
    ServiceParameter: ServiceParameter,
    ServiceParameterType: ServiceParameterType,
    setResourceController: setResourceController,
    getResourceController: getResourceController,
    model: model,
    service: service,
    behaviour: behaviour,
    server: function (paths, options) {

        if (server) return server;
        app.disable("x-powered-by");
        if (options.proxy) app.set('trust proxy', options.proxy);
        app.use(logger('dev'));
        app.use(limiter);
        var corsDelegate = function (req, callback) {

            var corsOptions = {

                origin: false,
                credentials: true
            };
            var maxAge = options.maxAge;
            var keys = Object.keys(routes);
            for (var i = 0; i < keys.length; i++) {

                var routeOptions = routes[keys[i]];
                var prefix = routeOptions.prefix || options.path;
                var method;
                if (typeof routeOptions.method === 'string' &&
                    typeof app[routeOptions.method.toLowerCase()] === 'function')
                    method = routeOptions.method.toLowerCase();
                var origins =
                    routeOptions.origins != undefined ? routeOptions.origins : options.origins;
                origins =
                    typeof origins === 'string' && origins.length > 0 ? origins : origins == true;
                var path = req.path || req.originalUrl || req.url;
                var [path, query] = path.split('?');
                var events_path = false;
                if (query && routeOptions.events && compare({

                    path: resolve(prefix, '/events', path)
                }, {

                    path: path
                }) && req.method.toLowerCase() === 'get') {

                    query = querystring.parse(query);
                    if (keys[i] == query.behaviour) events_path = true;
                }
                if (origins && (events_path || (compare({

                    path: resolve(prefix, routeOptions.path, path)
                }, {

                    path: path
                }) && [method, 'options'].indexOf(req.method.toLowerCase()) > -1))) {

                    setCorsOptions(corsOptions, origins, routeOptions, req);
                    maxAge = routeOptions.maxAge != undefined ? routeOptions.maxAge : maxAge;
                    break;
                }
            }
            if (!isNaN(parseInt(maxAge))) corsOptions.maxAge = maxAge;
            callback(null, corsOptions);
        };
        app.all('/*', cors(corsDelegate));
        app.use(session = session({

            name: 'behaviours.sid',
            store: new MemoryStore(),
            resave: false,
            secret: '' + new Date().getTime()
        }));
        var { upgrade, validate, connect } = new BehavioursServer(options.path, options.parser, paths);
        if (typeof paths === 'object' && typeof paths.proxy === 'string' &&
            paths.proxy.length > 0) require(paths.proxy);
        if (typeof options.static === 'object') {

            if (typeof options.static.route === 'string') app.use(options.static.route,
                serve(options.static.path, options.static));
            else app.use(serve(options.static.path, options.static));
        }
        if (typeof options.parserOptions !== 'object') options.parserOptions = undefined;
        app.use(typeof options.parser === 'string' &&
            typeof bodyParser[options.parser] === 'function' ?
            bodyParser[options.parser](options.parserOptions) :
            bodyParser.json(options.parserOptions));
        if (typeof paths === 'string' && paths.length > 0) require(paths);
        else if (typeof paths === 'object' && typeof paths.local === 'string' &&
            paths.local.length > 0) require(paths.local);
        app.use(function (req, res, next) {

            var err = new Error('Not found');
            if (/[A-Z]/.test(req.path))
                err = new Error('Not found, maybe the case-sensitivity of the path');
            err.code = 404;
            next(err);
        });
        app.use(function (err, req, res, next) {

            debug(err);
            if (res.headersSent) return next(err);
            respond(res.status(HttpStatus.getStatus(err.code) || 500), {

                behaviour: err.name,
                version: err.version,
                message: err.message
            }, options.parser);
        });
        var https = typeof options.https === 'object';
        var port = https ? 443 : 80;
        app.set('port', options.port || process.env.PORT || port);
        var module = https ? 'https' : 'http';
        server = require(module).createServer(function () {

            if (https) return ['key', 'cert', 'ca'].reduce(function (https, prop) {

                var path = options.https[prop];
                if (typeof path === 'string' && fs.existsSync(path))
                    https[prop] = fs.readFileSync(path).toString();
                return https;
            }, {}); else return app;
        }(), app);
        var io = new Server(server, {

            cors: corsDelegate,
            allowEIO3: true
        });
        io.of(function (path, query, next) {

            var err = validate(path, query);
            next(err, !err);
        }).on('connect', function (socket) {

            socket.once('disconnect', function () {

                debug('backend socket:' + socket.id + ' disconnected on port ' + app.get('port'));
            });
            connect(socket);
        }).use(function (socket, next) {

            session(socket.handshake, {}, next);
        });
        server.removeAllListeners("upgrade");
        server.on("upgrade", function (req, socket, head) {

            if (!upgrade(req, socket, head)) io.engine.handleUpgrade(req, socket, head);
        });
        server.listen(app.get('port'), function () {

            debug('backend listening on port ' + app.get('port'));
        });
        return server;
    },
    app: function (paths, options) {

        if (server) return app;
        this.server(paths, options);
        return app;
    }
};
