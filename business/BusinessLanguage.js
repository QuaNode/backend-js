/*jslint node: true */
'use strict';

var getIfReturn = function(beginConditions, condition) {

    var self = this;
    return {

        begin: function() {

            var operations = arguments[0];
            if (typeof operations === 'string') operations = [operations];
            if (Array.isArray(operations)) {

                for (var i = 0; i < operations.length; i++) {

                    beginConditions[operations[i]] = condition;
                }
            }
            return self.begin.apply(self, arguments);
        }
    };
};

var getUseReturn = function(middlewares, middleware, useConditions, beginConditions, begin) {

    var self = this;
    return {

        begin: function() {

            for (var j = 0; j < arguments.length; j++) {

                if (typeof arguments[j] !== 'function') throw new Error('Invalid begin parameters');
            }
            begin = arguments;
            return this;
        },
        when: function(operations, condition, options) {

            if (typeof condition === 'object' && typeof options !== 'object') {

                options = condition;
            }
            var useMiddlewareWhen = function(operation) {

                if (typeof options === 'object') {

                    if (options.order > -1 && options.order < middlewares[operation].length) {

                        if (options.override === true) {

                            middlewares[operation][options.order] = middleware;
                            return;
                        } else {

                            middlewares[operation].splice(options.order, 0, middleware);
                            return;
                        }
                    } else if (options.override === true) {

                        middlewares[operation] = [middleware];
                        return;
                    }
                }
                if (typeof condition === 'boolean' || typeof condition === 'function') {

                    useConditions[operations[i]] = condition;
                    if (begin) beginConditions[operations[i]] = condition;
                }
                if (!Array.isArray(middlewares[operation])) middlewares[operation] = [];
                middlewares[operation].push(middleware);
            };
            if (!Array.isArray(operations)) operations = [operations];
            for (var i = 0; i < operations.length; i++) {

                if (typeof operations[i] !== 'string') throw new Error('Invalid operation key');
                useMiddlewareWhen(operations[i]);
            }
            if (begin) {

                var args = Array.prototype.slice.call(begin);
                args.unshift(operations);
                self.begin.apply(self, args);
            }
            return self;
        }
    };
};

var BusinessLanguage = function(options) {

    var self = this;
    var middlewares = options.middlewares;
    var delegates = options.delegates;
    var watchers = options.watchers;
    var useConditions = options.useConditions;
    var beginConditions = options.beginConditions;
    self.watch = function(operation, callback) {

        if (typeof operation !== 'string' || typeof callback !== 'function') throw new Error('Invalid watch parameters');
        if (!watchers[operation]) watchers[operation] = [];
        watchers[operation].push(callback);
        return self;
    };
    self.if = function() {

        var condition = arguments[0];
        return getIfReturn.apply(self, [beginConditions, condition]);
    };
    self.begin = function() {

        if (arguments.length > 1) {

            var operations = arguments[0];
            if (typeof operations === 'string' && typeof arguments[1] === 'function') {

                delegates[operations] = arguments[1];
            } else if (Array.isArray(operations) && operations.length <= arguments.length - 1) {

                for (var i = 1; i < arguments.length; i++) {

                    if (typeof arguments[i] !== 'function') throw new Error('Invalid delegate function');
                    delegates[operations[i - 1]] = arguments[i];
                }
            } else throw new Error('Invalid begin parameters');
        } else throw new Error('Invalid begin parameters');
        return self;
    };
    self.use = function(middleware) {

        if (typeof middleware !== 'function') throw new Error('Invalid behaviour middleware function');
        var begin = null;
        return getUseReturn.apply(self, [middlewares, middleware, useConditions, beginConditions, begin]);
    };
};

module.exports.BusinessLanguage = BusinessLanguage;
