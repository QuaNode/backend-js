/*jslint node: true */
'use strict';

var setComparisonOperators = require('./model.js').setComparisonOperators;
var setLogicalOperators = require('./model.js').setLogicalOperators;
var setModelController = require('./model.js').setModelController;
var model = require('./model.js').model;
var behaviour = require('./behaviour.js').behaviour;
var behaviours = require('./behaviour.js').behaviours;
var utility = require('path');

var expressApp = null;

module.exports = function(app) {

    expressApp = app;
    var backend = {

        setComparisonOperators: setComparisonOperators,
        setLogicalOperators: setLogicalOperators,
        setModelController: setModelController,
        model: function() {

            return model;
        },
        behaviour: function(path) {

            return behaviour(app || expressApp, path);
        },
        behaviours: function(path) {

            if (typeof(expressApp || app) !== 'object' || typeof(expressApp || app).get !== 'function') {

                throw new Error('Invalid express app');
            }
            (expressApp || app).get(typeof path === 'string' ? utility.join(path, '/behaviours') : '/behaviours', function(req, res) {

                res.json(behaviours);
            });
        }
    };
    return backend;
};
