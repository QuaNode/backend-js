/*jslint node: true */
'use strict';

var utility = require('path');
var bodyParser = require('body-parser');
var logger = require('morgan');
var ModelEntity = require('./model/ModelEntity.js').ModelEntity;
var QueryExpression = require('./model/QueryExpression.js').QueryExpression;
var setComparisonOperators = require('./model.js').setComparisonOperators;
var setLogicalOperators = require('./model.js').setLogicalOperators;
var setModelController = require('./model.js').setModelController;
var model = require('./model.js').model;
var allowCrossOrigins = require('./utils.js').allowCrossOrigins;
var backend = require('./behaviour.js');

var app = backend.app;
var behaviour = backend.behaviour;
var behaviours = backend.behaviours;
var started = false;

module.exports = {

    ModelEntity: ModelEntity,
    QueryExpression: QueryExpression,
    setComparisonOperators: setComparisonOperators,
    setLogicalOperators: setLogicalOperators,
    setModelController: setModelController,
    model: function() {

        return model;
    },
    behaviour: behaviour,
    app: function(path, options) {

        if (started) return app;
        started = true;
        app.use(logger('dev'));
        app.all('/*', function(req, res, next) {

            var keys = Object.keys(backend.meta);
            for (var i = 0; i < keys.length; i++) {

                var route = typeof options.path === 'string' && typeof backend.meta[keys[i]].path === 'string' ?
                    utility.join(options.path, backend.meta[keys[i]].path) : backend.meta[keys[i]].path || options.path;
                var method = typeof backend.meta[keys[i]].method === 'string' &&
                    typeof app[backend.meta[keys[i]].method.toLowerCase()] == 'function' && backend.meta[keys[i]].method.toLowerCase();
                var origins = options.origins || backend.meta[keys[i]].options;
                origins = typeof origins === 'string' && origins.length > 0 && origins;
                if (origins && route === req.path && (method === req.method.toLowerCase() || req.method === 'OPTIONS')) {

                    allowCrossOrigins(backend.meta[keys[i]], res, origins);
                    break;
                }
            }
            if (/[A-Z]/.test(req.path)) {

                res.status(404).json({

                    'message': 'Small letters url required'
                });
            } else if (req.method === 'OPTIONS') {

                res.status(200).end();
            } else {

                next();
            }
        });
        behaviours(options.path);
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
            res.status(err.code || 500).json({

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
