/*jslint node: true */
'use strict';

var ResourceType = {

    IMAGE: 'image',
    RESOURCE: 'resource'
};

var ResourceInfo = function() {

    this.id = null;
    this.username = null;
    this.url = null;
    this.path = null;
    this.type = null;
    this.bytesLength = null;
    this.downloadProgress = function() {};
};

module.exports.ResourceType = ResourceType;
module.exports.ResourceInfo = ResourceInfo;
