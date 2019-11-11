/*jslint node: true */
/*jshint esversion: 6 */
/*global window*/
/*global document*/
/*global LocalFileSystem*/
/*global FileReader*/
/*global device*/
/*global Windows*/
'use strict';

let CacheFileSystem = require('./CacheFileSystem.js').CacheFileSystem;

var CacheFileSystemWorker = function (cb) {

    var self = this;
    var cacheFileSystem = new CacheFileSystem(cb);
    self.getRootPath = function () {

        return cacheFileSystem.getRootPath();
    };
    var getDirectory = function (pathComponents, create, callback) {

        cacheFileSystem.getDirectory(pathComponents, create, callback);
    };
    self.readFile = function (path, callback) {


    };
    self.writeFile = function (path, data, callback) {


    };
    self.removeRootPath = function (path) {

        return cacheFileSystem.removeRootPath(path);
    };
    self.isFileExisted = function (path, callback) {

        return cacheFileSystem.isFileExisted(path, callback);
    };
};

module.exports.CacheFileSystemWorker = CacheFileSystemWorker;
