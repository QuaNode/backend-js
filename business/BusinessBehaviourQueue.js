/*jslint node: true */
'use strict';

var getCancelFunc = function (behaviour, cancelExecutingBehaviour, behaviourQueue, executingBehaviourQueue) {

    var self = this;
    return function (ignoreSetComplete) {

        behaviourQueue.forEach(function (bhv) {

            if (behaviour.hasMandatoryBehaviour(bhv)) {

                getCancelFunc.apply(self, [bhv, cancelExecutingBehaviour, behaviourQueue,
                    executingBehaviourQueue])();
            }
        });
        if (executingBehaviourQueue.indexOf(behaviour) > -1) {

            if (typeof cancelExecutingBehaviour === 'function') cancelExecutingBehaviour(behaviour);
        } else if (behaviourQueue.indexOf(behaviour) > -1) {

            self.dequeue(behaviour, ignoreSetComplete, 'cancelled');
        }
    };
};

var getCompletionObject = function (completionDelegate) {

    return {

        data: {

            success: null,
            dependentBehaviours: null
        },
        apply: function (success, dependentBehaviours) {

            this.data.success = (typeof success === 'boolean' && success) || this.data.success;
            this.data.dependentBehaviours = dependentBehaviours || this.data.dependentBehaviours;
            completionDelegate(function () {

                return typeof this.data.success === 'function' ? this.data.success.apply(null, arguments) :
                    this.data.success;
            }, function () {

                return typeof this.data.dependentBehaviours === 'function' ?
                    this.data.dependentBehaviours.apply(null, arguments) : this.data.dependentBehaviours;
            });
        },
        success: function () {

            this.data.success = arguments[0];
            return this;
        },
        dependencies: function () {

            this.data.dependentBehaviours = arguments[0];
            return this;
        }
    };
};

var BusinessBehaviourQueue = function (setComplete, setError) {

    var self = this;
    var behaviourQueue = [];
    var executingBehaviourQueue = [];
    self.length = function () {

        return behaviourQueue.length;
    };
    self.cancelAll = function (cancelExecutingBehaviour) {

        for (var i = 0; i < behaviourQueue.length; i++) {

            getCancelFunc.apply(self, [behaviourQueue[i], cancelExecutingBehaviour, behaviourQueue,
                executingBehaviourQueue])();
        }
    };
    self.isEnqueued = function (behaviour) {

        return behaviourQueue.some(function (bhv) {

            return behaviour.isEqualToBehaviour(bhv);
        });
    };
    self.suspend = function (currentBehaviour) {

        var index = behaviourQueue.indexOf(currentBehaviour);
        if (index > -1 && index !== behaviourQueue.length - 1) {

            index = executingBehaviourQueue.indexOf(currentBehaviour);
            if (index > -1) executingBehaviourQueue.splice(index, 1);
            return true;
        }
        return false;
    };
    self.enqueue = function (behaviour, next, cancelExecutingBehaviour) {

        for (var i = behaviourQueue.length - 1; true; i--) {

            var currentBehaviour = i < 0 ? null : behaviourQueue[i];
            if (i < 0 || currentBehaviour.hasMandatoryBehaviour(behaviour) ||
                currentBehaviour.priority < behaviour.priority) {

                behaviourQueue.splice(i + 1, 0, behaviour);
                break;
            }
        }
        if (behaviourQueue.indexOf(behaviour) === behaviourQueue.length - 1) {

            next();
        }
        return getCancelFunc.apply(self, [behaviour, cancelExecutingBehaviour, behaviourQueue,
            executingBehaviourQueue]);
    };
    self.dequeue = function (currentBehaviour, ignoreSetComplete, error) {

        var index = behaviourQueue.indexOf(currentBehaviour);
        if (index > -1) {

            behaviourQueue.splice(index, 1);
            var completionDelegate = function (isSuccess, getDependentBehaviours) {

                var success = typeof isSuccess === 'function' && isSuccess();
                var dependentBehaviours = (typeof getDependentBehaviours === 'function' &&
                    getDependentBehaviours()) || [];
                if (!success) {

                    dependentBehaviours.forEach(function (bhv) {

                        if (executingBehaviourQueue.indexOf(bhv) === -1 && behaviourQueue.indexOf(bhv) > -1) {

                            self.dequeue(bhv, false, 'failed');
                        }
                    });
                }
            };
            if (!ignoreSetComplete && typeof setComplete === 'function') setTimeout(function () {

                if (typeof setError === 'function' && error) setError(currentBehaviour, error);
                setComplete(currentBehaviour, getCompletionObject(completionDelegate));
            });
            return true;
        }
        return false;
    };
    self.execute = function () {

        var currentBehaviour = null;
        for (var i = behaviourQueue.length - 1; i >= 0; i--) {

            if (executingBehaviourQueue.indexOf(behaviourQueue[i]) === -1) {

                currentBehaviour = behaviourQueue[i];
                executingBehaviourQueue.push(currentBehaviour);
                break;
            }
        }
        return currentBehaviour;
    };
    self.finish = function (currentBehaviour, next) {

        if (executingBehaviourQueue.every(function (bhv) {

            return !bhv.hasMandatoryBehaviour(currentBehaviour);
        })) {

            next();
        }
        var index = executingBehaviourQueue.indexOf(currentBehaviour);
        if (index > -1) executingBehaviourQueue.splice(index, 1);
    };
};

module.exports.BusinessBehaviourQueue = BusinessBehaviourQueue;
