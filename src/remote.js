/*jslint node: true */
/*jshint esversion: 6 */
'use strict';

var define = require('define-js');
var Behaviours = require('js-behaviours');
var BusinessBehaviour = require('behaviours-js').BusinessBehaviour;
var businessController = require('./controller.js').businessController;

module.exports.getRemoteBehaviour =
    function (options, config, types, BEHAVIOURS, defaultRemotes, FetchBehaviours) {

        var getRBConstructor = function (init) {

            return function () {

                var ȯptions = arguments[0];
                ȯptions.inputObjects = (ȯptions && ȯptions.parameters) || ȯptions.inputObjects;
                var self = init.apply(this, arguments).self();
                Object.defineProperty(self, 'parameters', {

                    enumerable: true,
                    get: function () {

                        return self.inputObjects;
                    },
                    set: function (parameters) {

                        self.inputObjects = parameters;
                    }
                });
                self.run = function (behaviour, parameters, callback) {

                    var queue, database, storage, fetcher, fetching, FetchBehaviour, memory;
                    if (!(behaviour instanceof BusinessBehaviour)) {

                        if (typeof behaviour !== 'string' || !BEHAVIOURS[behaviour])
                            throw new Error('Invalid behaviour name');
                        var ȯptiȯns = BEHAVIOURS[behaviour].options;
                        database = ȯptiȯns.database;
                        storage = ȯptiȯns.storage;
                        fetcher = ȯptiȯns.fetcher;
                        fetching = options.fetching;
                        if (fetcher) FetchBehaviour = BEHAVIOURS[behaviour].constructor;
                        memory = ȯptiȯns.memory;
                        behaviour = typeof parameters === 'function' ?
                            parameters(BEHAVIOURS[behaviour].constructor) :
                            new BEHAVIOURS[behaviour].constructor({

                                name: behaviour,
                                type: types[options.type],
                                priority: options.priority || 0,
                                inputObjects: parameters
                            });
                        if (ȯptiȯns.queue && (database || storage || fetcher || fetching))
                            queue = typeof ȯptiȯns.queue === 'function' ?
                                ȯptiȯns.queue(ȯptiȯns.name, behaviour.parameters) : ȯptiȯns.queue;
                    } else callback = parameters;
                    if (typeof callback !== 'function')
                        throw new Error('Invalid behaviour callback');
                    if (typeof parameters !== 'function' || callback == parameters)
                        self.mandatoryBehaviour = behaviour;
                    if (!queue) {

                        queue = typeof options.queue === 'function' ?
                            options.queue(options.name, self.inputObjects) : options.queue;
                    }
                    if (!FetchBehaviour) {

                        var fetch = typeof options.fetcher === 'string' ? options.fetcher :
                            typeof fetching === 'string' ? fetching :
                                typeof options.fetching === 'string' ? options.fetching : '';
                        FetchBehaviour = FetchBehaviours[fetch];
                    }
                    businessController(queue, database || options.database, storage || options.storage,
                        fetcher || options.fetcher || fetching || options.fetching, FetchBehaviour,
                        memory || options.memory).runBehaviour(behaviour, null, callback);
                    return self;
                };
                self.remote = function (baseURL) {

                    return {

                        run: function (behaviour, parameters, callback) {

                            if (baseURL === 'local')
                                return self.run(behaviour, parameters, callback);
                            if (typeof behaviour !== 'string' || behaviour.length === 0)
                                throw new Error('Invalid behaviour name');
                            var remotes;
                            if (typeof config === 'object') remotes = config.remotes
                            var remoteURL = Object.assign(typeof remotes === 'object' ?
                                remotes : {}, defaultRemotes)[baseURL];
                            var behaviours;
                            if (remoteURL) baseURL = remoteURL;
                            if (baseURL instanceof Behaviours) behaviours = baseURL;
                            else if (typeof baseURL === 'string' && baseURL.length > 0) {

                                behaviours = new Behaviours(baseURL);
                                if (defaultRemotes[baseURL])
                                    defaultRemotes[baseURL] = behaviours;
                                else if (typeof remotes === 'object')
                                    remotes[baseURL] = behaviours;
                            } else throw new Error('Invalid remote base URL');
                            behaviours.ready(function () {

                                behaviours[behaviour](parameters, callback);
                            });
                            return self;
                        }
                    };
                };
            }
        };
        return typeof options.inherits === 'function' ?
            define(getRBConstructor).extend(options.inherits).defaults({

                type: types[options.type],
                inputObjects: options.defaults
            }) : define(getRBConstructor).extend(BusinessBehaviour).defaults({

                type: types[options.type]
            });
    };