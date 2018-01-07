/*jslint node: true */
'use strict';

var ModelEntities = {};

module.exports.ModelEntity = function(options) {

    var self = this;
    var constructor = options.constructor;
    var attributes = options.attributes;
    var features = options.features;
    var query = options.query;
    if (typeof constructor !== 'function' || Array.isArray(attributes) === 0) throw new Error('Invalid entity parameters');
    self.getObjectConstructor = function() {

        return constructor;
    };
    self.getObjectAttributes = function() {

        return attributes;
    };
    self.getObjectFeatures = function() {

        return features;
    };
    self.getObjectQuery = function() {

        return query;
    };
};

module.exports.ModelEntity.registerModelEntity = function(options) {

    var entity = options.entity;
    var entityName = options.entityName;
    var isEntity = typeof entity === 'function';
    var isEntityName = typeof entityName === 'string' && entityName.length > 0;
    if (isEntity && isEntityName) ModelEntities[entityName] = entity;
    else throw new Error('Invalid entity parameters');
};

module.exports.ModelEntity.createModelEntity = function(entityName, options) {

    return ModelEntities[entityName] && new ModelEntities[entityName](options);
};

module.exports.ModelEntity.getModelEntity = function(entityName) {

    return ModelEntities[entityName];
};
