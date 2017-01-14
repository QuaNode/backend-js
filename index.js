/*jslint node: true */
'use strict';

var ModelEntity = require('./model/ModelEntity.js').ModelEntity;
var QueryExpression = require('./model/QueryExpression.js').QueryExpression;
var setComparisonOperators = require('./model.js').setComparisonOperators;
var setLogicalOperators = require('./model.js').setLogicalOperators;
var setModelController = require('./model.js').setModelController;
var model = require('./model.js').model;
var backend = require('./behaviour.js');
var behaviour = backend.behaviour;
var behaviours = backend.behaviours;
var app = backend.app;
var bodyParser = require('body-parser');
var logger = require('morgan');
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
    behaviours: behaviours,
    app: function(path, options) {

        if (started) return app;
        started = true;
        app.use(logger('dev'));
        app.use(typeof options.parser === 'string' && typeof bodyParser[options.parser] === 'function' ?
            bodyParser[options.parser]() : bodyParser.json());
        if (typeof options.origins === 'string' && options.origins.length > 0) {

            app.all((typeof options.path === 'string' && options.path.length > 0 ? options.path : '') + '/*', function(req, res, next) {

                backend.origins = options.origins;
                res.header('Access-Control-Allow-Origin', options.origins);
                if (/[A-Z]/.test(req.path)) {

                    res.status(404).json({

                        'message': 'Small letters url required'
                    });
                } else {

                    next();
                }
            });
        }
        if (typeof options.path === 'string' && options.path.length > 0) behaviours(options.path);
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
