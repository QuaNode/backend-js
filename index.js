/*jslint node: true */
'use strict';

var bodyParser = require('body-parser');
var logger = require('morgan');
var Route = require('route-parser');
var ModelEntity = require('./model/ModelEntity.js').ModelEntity;
var QueryExpression = require('./model/QueryExpression.js').QueryExpression;
var setComparisonOperators = require('./model.js').setComparisonOperators;
var setLogicalOperators = require('./model.js').setLogicalOperators;
var setModelController = require('./model.js').setModelController;
var model = require('./model.js').model;
var service = require('./service.js').service;
var allowCrossOrigins = require('./utils.js').allowCrossOrigins;
var respond = require('./utils.js').respond;
var backend = require('./behaviour.js');
var ServiceParameter = require('./service/ServiceParameter').ServiceParameter;
var ServiceParameterType = require('./service/ServiceParameter').ServiceParameterType;


var app = backend.app;
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
    setModelController: setModelController,
    ServiceParameter: ServiceParameter,
    ServiceParameterType: ServiceParameterType,
    model: function() {

        return model;
    },
    service: function() {

        return service;
    },
    behaviour: behaviour,
    app: function(path, options) {

        if (started) return app;
        started = true;
        app.use(logger('dev'));
        app.all('/*', function(req, res, next) {

            var keys = Object.keys(meta);
            for (var i = 0; i < keys.length; i++) {

                var route = typeof options.path === 'string' && typeof meta[keys[i]].path === 'string' ?
                    join(options.path, meta[keys[i]].path) : meta[keys[i]].path || options.path;
                if (route) route = new Route(route);
                var method = typeof meta[keys[i]].method === 'string' &&
                    typeof app[meta[keys[i]].method.toLowerCase()] === 'function' && meta[keys[i]].method.toLowerCase();
                var origins = options.origins || meta[keys[i]].origins;
                origins = typeof origins === 'string' && origins.length > 0 && origins;
                if (origins && route && route.match(req.path) && (method === req.method.toLowerCase() || req.method === 'OPTIONS')) {

                    allowCrossOrigins(meta[keys[i]], res, origins);
                    break;
                }
            }
            if (/[A-Z]/.test(req.path)) {

                respond(res.status(404), {

                    'message': 'Small letters url required'
                });
            } else if (req.method === 'OPTIONS') {

                res.status(200).end();
            } else {

                next();
            }
        });
        behaviours(options.path, options.parser);
        if (typeof options.static === 'object') {

            if (typeof options.static.route === 'string') app.use(options.static.route, serve(options.static.path, options.static));
            else app.use(serve(options.static.path, options.static));
        }
        if (typeof options.parserOptions !== 'object') options.parserOptions = undefined;
        app.use(typeof options.parser === 'string' && typeof bodyParser[options.parser] === 'function' ?
            bodyParser[options.parser](options.parserOptions) : bodyParser.json(options.parserOptions));
        if (typeof path === 'string' && path.length > 0) require(path);
        app.use(function(req, res, next) {

            var err = new Error('Not Found');
            err.code = 404;
            next(err);
        });
        app.use(function(err, req, res, next) {

            console.log(err);
            respond(res.status(err.code || 500), {

                behaviour: err.name,
                version: err.version,
                message: err.message
            });
        });
        app.set('port', options.port || process.env.PORT || 3000);
        var server = app.listen(app.get('port'), function() {

            console.log('Express server listening on port ' + server.address().port);
        });
        return app;
    }
};
