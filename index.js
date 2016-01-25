/*jslint node: true */
'use strict';

var setComparisonOperators = require('./model.js').setComparisonOperators;
var setLogicalOperators = require('./model.js').setLogicalOperators;
var setModelController = require('./model.js').setModelController;
var model = require('./model.js').model;
var behaviour = require('./behaviour.js').behaviour;


module.exports = function(app) {

    var backend = {

        setComparisonOperators: setComparisonOperators,
        setLogicalOperators: setLogicalOperators,
        setModelController: setModelController,
        model: function() {

            return model;
        },
        behaviour: function(pathPrefix) {

            return behaviour(app, pathPrefix);
        },
    };
    return backend;
};
