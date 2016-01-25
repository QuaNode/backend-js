/*jslint node: true */
'use strict';

var stackTrace = require('stacktrace-parser');
var os = require('os');

function filterKeys(obj, filters) {

    if (!obj || !filters || typeof obj !== 'object') {

        return obj;
    }
    Object.keys(obj).forEach(function (i) {

        if (filters.indexOf(i) > -1) {

            delete obj[i];
        } else {

            obj[i] = filterKeys(obj[i], filters);
        }
    });
    return obj;
}
var RaygunMessageBuilder = function (options) {

    options = options || {};
    var _filters;
    var _tags;
    if (Array.isArray(options.filters)) {

        _filters = options.filters;
    }
    if (Array.isArray(options.tags)) {

        _tags = options.tags;
    }
    var message = {

        occurredOn: new Date(),
        details: {

            client: {

                name: 'raygun-node',
                version: '0.5.0'
            },
            tags: _tags
        }
    };
    this.build = function () {

        return message;
    };
    this.setErrorDetails = function (error) {

        var stack = [];
        var trace = stackTrace.parse(error.stack);
        trace.forEach(function (callSite) {

            stack.push({

                lineNumber: callSite.lineNumber,
                className: callSite.typeName || '[object]',
                fileName: callSite.file,
                methodName: (callSite.methodName !== '<unknown>' && callSite.methodName) || '[anonymous]'
            });
        });
        message.details.error = {

            stackTrace: stack,
            message: error.message || 'NoMessage',
            className: error.name
        };
        return this;
    };
    this.setEnvironmentDetails = function () {

        var environment = {

            osVersion: os.type() + ' ' + os.platform() + ' ' + os.release(),
            architecture: os.arch(),
            totalPhysicalMemory: os.totalmem(),
            availablePhysicalMemory: os.freemem(),
            utcOffset: new Date().getTimezoneOffset() / -60.0
        };
        // cpus seems to return undefined on some systems
        var cpus = os.cpus();
        if (cpus && cpus.length && cpus.length > 0) {

            environment.processorCount = cpus.length;
            environment.cpu = cpus[0].model;
        }
        message.details.environment = environment;
        return this;
    };
    this.setMachineName = function (machineName) {

        message.details.machineName = machineName || os.hostname();
        return this;
    };
    this.setUserCustomData = function (customData) {

        message.details.userCustomData = customData;
        return this;
    };
    this.setRequestDetails = function (request) {

        if (request) {

            message.details.request = {

                hostName: request.host,
                url: request.path,
                httpMethod: request.method,
                ipAddress: request.ip,
                queryString: filterKeys(request.query, _filters),
                headers: filterKeys(request.headers, _filters),
                form: filterKeys(request.body, _filters)
            };
        }
        return this;
    };
    var extractUserProperties = function (userData) {

        var data = {};
        if (userData.identifier) {

            data.identifier = userData.identifier;
        }
        if (userData.email) {

            data.email = userData.email;
        }
        if (userData.fullName) {

            data.fullName = userData.fullName;
        }
        if (userData.firstName) {

            data.firstName = userData.firstName;
        }
        if (userData.uuid) {

            data.uuid = userData.uuid;
        }
        return data;
    };
    this.setUser = function (user) {

        if (user instanceof Function) {

            var userData = user();
            if (userData instanceof Object) {

                message.details.user = extractUserProperties(userData);
            } else {

                message.details.user = {

                    'identifier': userData
                };
            }
        } else {

            message.details.user = {

                'identifier': user
            };
        }
        return this;
    };
    this.setVersion = function (version) {

        message.details.version = version;
        return this;
    };
};
exports = module.exports = RaygunMessageBuilder;
