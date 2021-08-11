/*jslint node: true */
/*jshint esversion: 6 */
'use strict';

var Namespace = require('socket.io').Namespace;
var debug = require('debug');
var define = require('define-js');
var getRemoteBehaviour = require('./remote.js').getRemoteBehaviour;

debug.enable('backend:*');
debug = debug('backend:event');

module.exports.getEventBehaviour =
	function (options, config, types, BEHAVIOURS, defaultRemotes, FetchBehaviours, getEmitters) {

		var getEBConstructor = function (init) {

			return function () {

				var self = init.apply(this, arguments).self();
				var emit = function (emitters, room, behavior, response, forceReceive) {

					emitters.forEach(function (emitter) {

						if (!forceReceive) emitter = emitter.volatile;
						emitter.to(room).emit(behavior, response);
					});
				};
				self.trigger = function (event, parameters, forceReceive) {

					var room = event;
					if (room && typeof room === 'object') room = JSON.stringify(room);
					if (typeof room !== 'string') throw new Error('Invalid event');
					var emitters = getEmitters(room);
					if (emitters) Object.keys(emitters).forEach(function (behavior_name) {

						var emitter = emitters[behavior_name];
						var behavior = BEHAVIOURS[behavior_name].options;
						if (Array.isArray(emitter)) self.run(behavior_name, parameters,
							function (behaviour_response, error) {

								var response = {

									behaviour: behavior.name,
									version: behavior.version
								};
								if (typeof error === 'object' || typeof behaviour_response !== 'object') {

									debug(err);
									response.message = error ? error.message : 'Error while executing ' +
										behavior.name + ' behaviour, version ' + behavior.version + '!';
								} else {

									response.response = behavior.paginate ? behaviour_response.modelObjects ||
										behaviour_response : behaviour_response;
									if (behavior.paginate) {

										response.has_more = behaviour_response.pageCount > parameters.page;
									}
									if (typeof behavior.returns === 'function') {

										behavior.returns(emitter.reduce(function (requests, anEmitter) {

											if (anEmitter instanceof Namespace) requests =
												requests.concat(anEmitter.allSockets().map(function (socket) {

													return socket.request;
												}));
											return requests;
										}, []), emitter, behaviour_response, error, function (outputObjects) {

											emit(emitter, room, behavior_name, outputObjects, forceReceive);
										});
										return;
									}
								}
								emit(emitter, room, behavior_name, response, forceReceive);
							});
					});
				};
			}
		};
		return define(getEBConstructor).extend(getRemoteBehaviour(options, config, types, BEHAVIOURS,
			defaultRemotes, FetchBehaviours)).defaults({

				type: types[options.type]
			});
	};
