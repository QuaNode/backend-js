/*jslint node: true */
'use strict';

var LogicalOperators = null;

var ComparisonOperators = null;

module.exports.setComparisonOperators = function (co) {

    if (typeof co !== 'object') {

        throw new Error('Invalid comparison operators');
    }
    ComparisonOperators = co;
    module.exports.ComparisonOperators = ComparisonOperators;
};

module.exports.setLogicalOperators = function (lo) {

    if (typeof lo !== 'object') {

        throw new Error('Invalid logical operators');
    }
    LogicalOperators = lo;
    module.exports.LogicalOperators = LogicalOperators;
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

var QueryExpression = function (options) {

    if (!ComparisonOperators) {

        throw new Error('Set comparison operators before using query expression');
    }
    if (!LogicalOperators) {

        throw new Error('Set logical operators before using query expression');
    }
    var comparisonOperator = options.comparisonOperator;
    var logicalOperator = options.logicalOperator;
    if (!isValidOperator(ComparisonOperators, comparisonOperator)) {

        throw new Error('The comparison operator is not one of the allowed comparison operators, please use ComparisonOperators');
    }
    if (logicalOperator && !isValidOperator(LogicalOperators, logicalOperator)) {

        throw new Error('The logical operator is not one of the allowed logical operators, please use LogicalOperators');
    }
    var self = this;
    self.fieldName = options.fieldName;
    self.comparisonOperator = comparisonOperator;
    self.comparisonOperatorOptions = options.comparisonOperatorOptions;
    self.fieldValue = options.fieldValue;
    self.logicalOperator = logicalOperator;
    self.contextualLevel = options.contextualLevel || 0;
};

module.exports.QueryExpression = QueryExpression;
