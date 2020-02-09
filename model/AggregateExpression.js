/*jslint node: true */
'use strict';

var ComputationOperators = null;

module.exports.setComputationOperators = function (co) {

    if (typeof co !== 'object') {

        throw new Error('Invalid computation operators');
    }
    ComputationOperators = co;
    module.exports.ComputationOperators = ComputationOperators;
};

var isValidOperator = function (object, value) {

    for (var prop in object) {

        if (object.hasOwnProperty(prop)) {

            if (object[prop] === value) {

                return true;
            }
        }
    }
    return false;
};

var AggregateExpression = function (options) {

    if (!ComputationOperators) {

        throw new Error('Set computation operators before using aggregate expression');
    }
    var fieldValue = options.fieldValue;
    if (!Array.isArray(fieldValue)) fieldValue = [fieldValue];
    fieldValue.forEach(function (computationOperator) {

        if (typeof computationOperator === 'function' && !isValidOperator(ComputationOperators,
            computationOperator)) {

            throw new Error('The computation operator is not one of the allowed computation operators, please use ComputationOperators');
        }
    });
    var self = this;
    self.fieldName = options.fieldName;
    self.fieldValue = fieldValue;
    self.contextualLevels = (Array.isArray(options.contextualLevels) && options.contextualLevels) || [];
    self.computationOrder = options.computationOrder || 0;
};

module.exports.AggregateExpression = AggregateExpression;
