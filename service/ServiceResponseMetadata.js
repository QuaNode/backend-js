/*jslint node: true */
'use strict';

module.exports.ServiceObjectMetadata = function (options) {

    var self = this;
    var modelAttributes = options.modelAttributes;
    var serviceAttributes = options.serviceAttributes;
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
    if (Array.isArray(modelAttributes) && Array.isArray(serviceAttributes)) {

        if (modelAttributes.length !== serviceAttributes.length)
            throw new Error('Invalid attributes count');
        self.attributes = [];
        for (var i = 0; i < modelAttributes.length; i++) {

            var attribute = new module.exports.ServiceAttributeMetadata({

                model: modelAttributes[i],
                name: serviceAttributes[i],
            });
            self.attributes.push(attribute);
        }
    }
    if (typeof options.id === 'string') {

        self.id = options.id;
    }
    self.storeID = options.storeID;
};

module.exports.ServiceAttributeMetadata = function (options) {

    var self = this;
    if (typeof options.model === 'string') {

        self.model = options.model;
    }
    if (typeof options.name === 'string') {

        self.name = options.name;
    }
    if (options.getValue) {

        if (typeof options.getValue === 'function') self.getValue = options.getValue;
        else throw new Error('Invalid service attribute value function');
    }
    if (options.metadata) {

        if (options.metadata instanceof module.exports.ServiceObjectMetadata)
            self.metadata = options.metadata;
        else throw new Error('Invalid service attribute object metadata');
    }
};
