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

module.exports = {

    QueryExpression : QueryExpression,
    setComparisonOperators: setComparisonOperators,
    setLogicalOperators: setLogicalOperators,
    setModelController: setModelController,
    model: function() {

        return model;
    },
    behaviour: behaviour,
    behaviours: behaviours,
    app: function() {

        return app;
    }
};
