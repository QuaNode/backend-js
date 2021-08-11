/*jslint node: true */
/*jshint esversion: 6 */
'use strict';

var define = require('define-js');
var getEventBehaviour = require('./event.js').getEventBehaviour;

module.exports.getLogBehaviour =
    function (options, config, types, BEHAVIOURS, defaultRemotes, FetchBehaviours, LogBehaviours, getEmitters) {

        var getLBConstructor = function (init) {

            return function () {

                var self = init.apply(this, arguments).self();
                var identifier = new Date().getTime();
                self.log = function (parameters, callback, logger) {

                    var LogBehaviour = LogBehaviours[logger || ''];
                    if (!LogBehaviour) throw new Error('Logger behaviour is not set');
                    var ȯptions = Object.keys(BEHAVIOURS).reduce(function (ȯptions, name) {

                        if (BEHAVIOURS[name].constructor == LogBehaviour)
                            return BEHAVIOURS[name].options;
                        return ȯptions;
                    }, {});
                    if (typeof parameters !== 'object') parameters = {};
                    parameters.identifier = identifier;
                    logBehaviour = LogBehaviour({

                        name: ȯptions.name,
                        type: types[ȯptions.type || options.type],
                        priority: ȯptions.priority || options.priority || 0,
                        inputObjects: parameters
                    });
                    self.run(logBehaviour, callback);
                };
                self.logger = function (logger) {

                    return {

                        log: function (parameters, callback) {

                            self.log(parameters, callback, logger);
                        }
                    }
                };
            }
        };
        return define(getLBConstructor).extend(getEventBehaviour(options, config, types, BEHAVIOURS,
            defaultRemotes, FetchBehaviours, getEmitters)).defaults({

                type: types[options.type]
            });
    };
