/*jslint node: true */
'use strict';

var LogicalOperators = null;

var ComparisonOperators = null;

module.exports.setComparisonOperators = function(co) {

    if (typeof co !== 'object') {

        throw new Error('Invalid comparison operators');
    }
    ComparisonOperators = co;
    module.exports.ComparisonOperators = ComparisonOperators;
};

module.exports.setLogicalOperators = function(lo) {

    if (typeof lo !== 'object') {

        throw new Error('Invalid logical operators');
    }
    LogicalOperators = lo;
    module.exports.LogicalOperators = LogicalOperators;
};

var isValidOperator = function(object, value) {

    for (var prop in object) {

        if (object.hasOwnProperty(prop)) {

            if (object[prop] === value) {

                return true;
            }
        }
    }
    return false;
};

var QueryExpression = function(options) {

    if (!ComparisonOperators) {

        throw new Error('Set comparison operators before using query expression');
    }
    if (!LogicalOperators) {

        throw new Error('Set logical operators before using query expression');
    }
    var self = this;
    var fieldName = options.fieldName;
    var comparisonOperator = options.comparisonOperator;
    var fieldValue = options.fieldValue;
    var logicalOperator = options.logicalOperator;
    var contextualLevel = options.contextualLevel;
    self.contextualLevel = contextualLevel || 0;
    self.fieldName = fieldName;
    if (isValidOperator(ComparisonOperators, comparisonOperator)) {

        self.comparisonOperator = comparisonOperator;
        self.comparisonOperatorOptions = options.comparisonOperatorOptions;
    } else {

        throw new TypeError('The comparison operator is not one of the allowed comparisonOperators, please use ComparisonOperators');
    }
    self.fieldValue = fieldValue;
    if (isValidOperator(LogicalOperators, logicalOperator)) {

        self.logicalOperator = logicalOperator;
    } else {

        if (logicalOperator) { //logical operator is optional

            throw new TypeError('The logical operator is not one of the allowed logicalOperators, please use LogicalOperators');
        }
    }
};

module.exports.QueryExpression = QueryExpression;
