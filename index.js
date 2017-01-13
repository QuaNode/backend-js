/*jslint node: true */
'use strict';

var ModelEntity = require('./model/ModelEntity.js').ModelEntity;
var QueryExpression = require('./model/QueryExpression.js').QueryExpression;
var setComparisonOperators = require('./model.js').setComparisonOperators;
var setLogicalOperators = require('./model.js').setLogicalOperators;
var setModelController = require('./model.js').setModelController;
var model = require('./model.js').model;
var behaviour = require('./behaviour.js').behaviour;
var behaviours = require('./behaviour.js').behaviours;
var app = require('./behaviour.js').app;
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
    app: function(webPath, localPath, format, port) {

        if (started) return app;
        started = true;
        app.use(logger('dev'));
        app.use(typeof format === 'string' && typeof bodyParser[format] === 'function' ? bodyParser[format]() : bodyParser.json());
        app.all('/*', function(req, res, next) {

            // res.header('Access-Control-Allow-Origin', '*');
            // res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
            // res.header('Access-Control-Allow-Headers', 'Content-type,Accept,X-Access-Token');
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
        if (typeof webPath === 'string' && webPath.length > 0) behaviours(webPath);
        if (typeof localPath === 'string' && localPath.length > 0) require(localPath);
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
        app.set('port', port || process.env.PORT || 3000);
        var server = app.listen(app.get('port'), function() {

            console.log('Express server listening on port ' + server.address().port);
        });
        return app;
    }
};
