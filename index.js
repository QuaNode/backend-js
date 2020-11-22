/*jslint node: true */
/*jshint esversion: 6 */
'use strict';

let fs = require('fs');
let bodyParser = require('body-parser');
let logger = require('morgan');
let Route = require('route-parser');
let HttpStatus = require('http-status-codes');
let rateLimit = require("express-rate-limit");
let debug = require('debug');
let ModelEntity = require('./model.js').ModelEntity;
let QueryExpression = require('./model.js').QueryExpression;
let setComparisonOperators = require('./model.js').setComparisonOperators;
let setLogicalOperators = require('./model.js').setLogicalOperators;
let AggregateExpression = require('./model.js').AggregateExpression;
let setComputationOperators = require('./model.js').setComputationOperators;
let setModelController = require('./model.js').setModelController;
let model = require('./model.js').model;
let ServiceParameter = require('./service.js').ServiceParameter;
let ServiceParameterType = require('./service.js').ServiceParameterType;
let service = require('./service.js').service;
let allowCrossOrigins = require('./utils.js').allowCrossOrigins;
let respond = require('./utils.js').respond;
let backend = require('./behaviour.js');

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

var server, app = backend.app;
var serve = backend.static;
var behaviour = backend.behaviour;
var behaviours = backend.behaviours;
var meta = backend.meta;
var join = backend.join;
var started = false;

module.exports = {

    ModelEntity: ModelEntity,
    QueryExpression: QueryExpression,
    setComparisonOperators: setComparisonOperators,
    setLogicalOperators: setLogicalOperators,
    AggregateExpression: AggregateExpression,
    setComputationOperators: setComputationOperators,
    setModelController: setModelController,
    ServiceParameter: ServiceParameter,
    ServiceParameterType: ServiceParameterType,
    model: function () {

        return model;
    },
    service: function () {

        return service;
    },
    behaviour: behaviour,
    server: function (paths, options) {

        if (started) return server;
        app.use(logger('dev'));
        app.use(limiter);
        app.all('/*', function (req, res, next) {

            var keys = Object.keys(meta);
            for (var i = 0; i < keys.length; i++) {

                var route = typeof options.path === 'string' &&
                    typeof meta[keys[i]].path === 'string' ?
                    join(options.path, meta[keys[i]].path) : meta[keys[i]].path || options.path;
                if (route) route = new Route(route);
                var method = typeof meta[keys[i]].method === 'string' &&
                    typeof app[meta[keys[i]].method.toLowerCase()] === 'function' &&
                    meta[keys[i]].method.toLowerCase();
                var origins = options.origins || meta[keys[i]].origins;
                origins = typeof origins === 'string' && origins.length > 0 && origins;
                if (origins && route && route.match(req.path) &&
                    (method === req.method.toLowerCase() ||
                        req.method === 'OPTIONS')) {

                    allowCrossOrigins(meta[keys[i]], req, res, origins);
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
                err = new Error('Not found, may be the case-sensitivity of the path');
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
        started = true;
        return server;
    },
    app: function (paths, options) {

        if (started) return app;
        this.server(paths, options);
        started = true;
        return app;
    }
};
