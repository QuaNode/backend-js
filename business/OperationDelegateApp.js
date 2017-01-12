/*jslint node: true */
'use strict';

var parse = require('parseparams');

var watch = function(operation, data, index, continṵe, watchers) {

    if (watchers[operation] && index > -1 && index < watchers[operation].length) {

        if (parse(watchers[operation][index])[1] === 'continṵe') watchers[operation][index](data, function() {

            watch(operation, data, index + 1, continṵe, watchers);
        }, function() {

            continṵe();
        });
        else {

            for (var i = index; i < watchers[operation].length; i++) {

                watchers[operation][i](data);
            }
            continṵe();
        }
    } else {

        continṵe();
    }
};

var getServiceContinue = function(delegate) {

    var that = this;
    return function() {

        delegate(typeof that.data.parameters === 'function' ? that.data.parameters : function() {

            return that.data.parameters;
        }, typeof that.data.service === 'function' ? that.data.service : function() {

            return that.data.service;
        }, function() {

            if (typeof that.data.callback === 'function') that.data.callback.apply(null, arguments);
            return that.data.append;
        });
    };
};

var getModelContinue = function(delegate) {

    var that = this;
    return function() {

        delegate(typeof that.data.query === 'function' ? that.data.query : function() {

            return that.data.query;
        }, typeof that.data.entity === 'function' ? that.data.entity : function() {

            return that.data.entity;
        }, function() {

            if (typeof that.data.callback === 'function') that.data.callback.apply(null, arguments);
            return that.data.append;
        });
    };
};

var getServiceMappingContinue = function(delegate) {

    var that = this;
    return function() {

        delegate(function() {

            if (typeof that.data.callback === 'function') that.data.callback.apply(null, arguments);
        });
    };
};

var getModelMappingContinue = function(delegate) {

    var that = this;
    return function() {

        delegate(function() {

            if (typeof that.data.identifiers === 'function') return that.data.identifiers.apply(null, arguments) || [];
            return that.data.identifiers || [];
        }, function() {

            if (typeof that.data.callback === 'function') that.data.callback.apply(null, arguments);
        });
    };
};

var getErrorHandlingContinue = function(delegate) {

    var that = this;
    return function() {

        delegate(typeof that.data.error === 'function' ? that.data.error : function() {

            return that.data.error;
        });
    };
};

var OperationDelegateApp = function(options) {

    var self = this;
    var watchers = options.watchers;
    self.serviceApply = function(serviceOperation, delegate, parameters, service, callback, append) {

        var that = this;
        that.data.parameters = parameters || that.data.parameters;
        that.data.service = service || that.data.service;
        that.data.callback = callback || that.data.callback;
        that.data.append = typeof parameters === 'boolean' ? parameters : ((typeof append === 'boolean' &&
            append) || that.data.append);
        watch(serviceOperation, that.data, 0, getServiceContinue.apply(that, [delegate]), watchers);
    };
    self.modelApply = function(modelOperation, delegate, queryOrObjects, entity, callback, append) {

        var that = this;
        that.data.query = (Array.isArray(queryOrObjects) && queryOrObjects) || that.data.query ||
            that.data.objects;
        that.data.entity = entity || that.data.entity;
        that.data.callback = callback || that.data.callback;
        that.data.append = typeof queryOrObjects === 'boolean' ? queryOrObjects : ((typeof append === 'boolean' &&
            append) || that.data.append);
        watch(modelOperation, that.data, 0, getModelContinue.apply(that, [delegate]), watchers);
    };
    self.serviceInputMappingApply = function(businessOperation, delegate, callback) {

        var that = this;
        that.data.callback = callback || that.data.callback;
        watch(businessOperation, that.data, 0, getServiceMappingContinue.apply(that, [delegate]), watchers);
    };
    self.modelOutputMappingApply = function(businessOperation, delegate, identifiers, callback) {

        var that = this;
        that.data.identifiers = identifiers || that.data.identifiers;
        that.data.callback = callback || that.data.callback;
        watch(businessOperation, that.data, 0, getModelMappingContinue.apply(that, [delegate]), watchers);
    };
    self.errorHandlingApply = function(businessOperation, delegate, error) {

        var that = this;
        that.data.error = error || that.data.error;
        watch(businessOperation, that.data, 0, getErrorHandlingContinue.apply(that, [delegate]), watchers);
    };
};

module.exports.OperationDelegateApp = OperationDelegateApp;
