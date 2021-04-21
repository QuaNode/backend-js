/*jslint node: true */
/*jshint esversion: 6 */
'use strict';

var fs = require('fs');
var bodyParser = require('body-parser');
var logger = require('morgan');
var Route = require('route-parser');
var HttpStatus = require('http-status-codes');
var rateLimit = require("express-rate-limit");
var debug = require('debug');
var {
    join,
    serve,
    app,
    routes,
    behaviours,
    behaviour
} = require('./behaviour.js');
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
    allowCrossOrigins,
    respond
} = require('./src/utils.js');

var TIMEOUT = 50;
var limiter = rateLimit({

    windowMs: 200,
    max: 1,
    headers: false,
    handler: function (req, res, next) {

        var timeout = req.rateLimit.limit + (req.rateLimit.resetTime.getTime() -
            new Date().getTime()) * (req.rateLimit.current - req.rateLimit.limit);
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
        app.use(logger('dev'));
        app.use(limiter);
        app.all('/*', function (req, res, next) {

            var keys = Object.keys(routes);
            for (var i = 0; i < keys.length; i++) {

                var route = typeof options.path === 'string' &&
                    typeof routes[keys[i]].path === 'string' ?
                    join(options.path, routes[keys[i]].path) : routes[keys[i]].path || options.path;
                if (route) route = new Route(route);
                var method = typeof routes[keys[i]].method === 'string' &&
                    typeof app[routes[keys[i]].method.toLowerCase()] === 'function' &&
                    routes[keys[i]].method.toLowerCase();
                var origins = options.origins || routes[keys[i]].origins;
                origins = typeof origins === 'string' && origins.length > 0 && origins;
                if (origins && route && route.match(req.path) &&
                    (method === req.method.toLowerCase() ||
                        req.method === 'OPTIONS')) {

                    allowCrossOrigins(routes[keys[i]], req, res, origins);
                    break;
                }
            }
            if (req.method === 'OPTIONS') res.status(200).end();
            else next();
        });
        behaviours(options.path, options.parser, paths);
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
            if (res.headersSent) {

                return next(err);
            }
            respond(res.status(HttpStatus.getStatus(err.code) || 500), {

                behaviour: err.name,
                version: err.version,
                message: err.message
            }, options.parser);
        });
        app.set('port', options.port || process.env.PORT ||
            (typeof options.https === 'object' ? 443 : 80));
        server = require(typeof options.https === 'object' ?
            'https' : 'http').createServer(function () {

                if (typeof options.https === 'object')
                    return ['key', 'cert', 'ca'].reduce(function (https, prop) {

                        if (typeof options.https[prop] === 'string' &&
                            fs.existsSync(options.https[prop]))
                            https[prop] = fs.readFileSync(options.https[prop]).toString();
                        return https;
                    }, {});
                else return app;
            }(), app).listen(app.get('port'), function () {

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
