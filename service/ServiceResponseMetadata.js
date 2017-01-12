/*jslint node: true */
'use strict';

module.exports.ServiceObjectMetadata = function(options) {

    var self = this;
    if (typeof options.model === 'string') {

        self.model = options.model;
    }
    if (typeof options.name === 'string') {

        self.name = options.name;
    }
    if (typeof options.attributesKeyName === 'string') {

        self.attributesKeyName = options.attributesKeyName;
    }
    if (typeof options.attributesValueName === 'string') {

        self.attributesValueName = options.attributesValueName;
    }
    if (Array.isArray(options.attributes)) {

        if (options.attributes.some(function(attribute) {

                return !(attribute instanceof module.exports.ServiceAttributeMetadata);
            })) throw new Error('invalid attributes');
        self.attributes = options.attributes;
    }
    if (typeof options.id === 'string') {

        self.id = options.id;
    }
    self.storeID = options.storeID;
};

module.exports.ServiceAttributeMetadata = function(options) {

    var self = this;
    if (typeof options.model === 'string') {

        self.model = options.model;
    }
    if (typeof options.name === 'string') {

        self.name = options.name;
    }
    if (options.getValue) {

        if (typeof options.getValue === 'function') self.getValue = options.getValue;
        else throw new Error('invalid service attribute value function');
    }
    if (options.metadata) {

        if (options.metadata instanceof module.exports.ServiceObjectMetadata) self.metadata = options.metadata;
        else throw new Error('invalid service attribute object metadata');
    }
};
