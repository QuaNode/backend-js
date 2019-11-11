/*jslint node: true */
/*jshint esversion: 6 */
/*global window*/
/*global device*/
/*global Blob*/
/*global BlobBuilder*/
'use strict';

let CacheFileSystem = require('./CacheFileSystem.js').CacheFileSystem;
let ResourceType = require('./CacheResourceInfo.js').ResourceType;

var STATUS_CODES = {

    0: 'Request aborted',
    100: 'Continue',
    101: 'Switching Protocols',
    102: 'Processing', // RFC 2518, obsoleted by RFC 4918
    200: 'OK',
    201: 'Created',
    202: 'Accepted',
    203: 'Non-Authoritative Information',
    204: 'No Content',
    205: 'Reset Content',
    206: 'Partial Content',
    207: 'Multi-Status', // RFC 4918
    300: 'Multiple Choices',
    301: 'Moved Permanently',
    302: 'Moved Temporarily',
    303: 'See Other',
    304: 'Not Modified',
    305: 'Use Proxy',
    307: 'Temporary Redirect',
    400: 'Bad Request',
    401: 'Unauthorized',
    402: 'Payment Required',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    406: 'Not Acceptable',
    407: 'Proxy Authentication Required',
    408: 'Request Time-out',
    409: 'Conflict',
    410: 'Gone',
    411: 'Length Required',
    412: 'Precondition Failed',
    413: 'Request Entity Too Large',
    414: 'Request-URI Too Large',
    415: 'Unsupported Media Type',
    416: 'Requested Range Not Satisfiable',
    417: 'Expectation Failed',
    418: 'I\'m a teapot', // RFC 2324
    422: 'Unprocessable Entity', // RFC 4918
    423: 'Locked', // RFC 4918
    424: 'Failed Dependency', // RFC 4918
    425: 'Unordered Collection', // RFC 4918
    426: 'Upgrade Required', // RFC 2817
    428: 'Precondition Required', // RFC 6585
    429: 'Too Many Requests', // RFC 6585
    431: 'Request Header Fields Too Large', // RFC 6585
    500: 'Internal Server Error',
    501: 'Not Implemented',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Time-out',
    505: 'HTTP Version Not Supported',
    506: 'Variant Also Negotiates', // RFC 2295
    507: 'Insufficient Storage', // RFC 4918
    509: 'Bandwidth Limit Exceeded',
    510: 'Not Extended', // RFC 2774
    511: 'Network Authentication Required' // RFC 6585
};

var deviceready = false;

var CacheController = function() {

    var self = this;
    var callback = null;
    window.cleanURLCache = window.plugins && window.plugins.utils && window.plugins.utils.cleanURLCache;
    var cacheFileSystem = new CacheFileSystem(function() {

        deviceready = true;
        if (typeof callback === 'function') callback();
        callback = null;
    });
    var isCanceled = {};
    var load = function(afterLoad) {

        if (!deviceready) callback = afterLoad;
        else if (typeof afterLoad === 'function') afterLoad();
    };
    var getUsersPath = function() {

        var path = cacheFileSystem.getRootPath();
        if (device.platform.toLowerCase() !== 'windows8') {

            path += 'edushareapp';
        }
        return path;
    };
    var getUserResourcePath = function(username) {

        if (device.platform.toLowerCase() !== 'windows8') return getUsersPath() + '/' + username + '/resources/';
        else return getUsersPath() + '\\' + username + '\\resources\\';
    };
    var getUserImagePath = function(username) {

        if (device.platform.toLowerCase() !== 'windows8') return getUsersPath() + '/' + username + '/images/';
        else return getUsersPath() + '\\' + username + '\\images\\';
    };
    var getHead = function(url, callback) {

        var headXHR = new window.XMLHttpRequest();
        headXHR.open('HEAD', url, true);
        headXHR.onerror = function() {

            var error = new Error(STATUS_CODES[headXHR.status]);
            error.code = headXHR.status;
            callback(0, 0, null, error);
        };
        headXHR.onload = function( /*oEvent*/ ) {

            if (headXHR.status < 301) {

                var fileSize = parseInt(headXHR.getResponseHeader('Content-Length'));
                var supportsRanges = headXHR.getResponseHeader('Accept-Ranges') === 'bytes';
                var fileType = headXHR.getResponseHeader('Content-Type');
                callback(fileSize, supportsRanges, fileType);
            } else headXHR.onerror();
        };
        headXHR.send();
    };
    var download = function(url, startByte, downloadProgress, completed) {

        getHead(url, function(fileSize, supportsRanges, fileType, er) {

            var downloadRange = function(start) {

                var SEGMENTSIZE = 10 * 1024 * 1024;
                var end = start + SEGMENTSIZE;
                if (end > fileSize) {

                    end = fileSize;
                }
                var getXHR = new window.XMLHttpRequest();
                getXHR.open('GET', url, true);
                getXHR.responseType = 'blob';
                if (supportsRanges) getXHR.setRequestHeader('Range', 'bytes=' + start + '-' + end);
                getXHR.onerror = function() {

                    var error = new Error(STATUS_CODES[getXHR.status]);
                    error.code = getXHR.status;
                    completed(null, start, fileSize, error);
                };
                getXHR.onload = function( /*oEvent*/ ) {

                    if (getXHR.status < 301) {

                        var blob = getXHR.response;
                        if (!(blob instanceof Blob)) try {

                            blob = new Blob([blob], {

                                type: fileType
                            });
                        } catch (e) {

                            window.BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder ||
                                window.MozBlobBuilder || window.MSBlobBuilder;
                            if (window.BlobBuilder) {

                                var blobBuilder = new BlobBuilder();
                                blobBuilder.append(blob, 'native');
                                blob = blobBuilder.getBlob(fileType);
                            } else {

                                throw new Error('can not obtain downloaded blob');
                            }
                        }
                        window.setTimeout(function() {

                            completed(blob, supportsRanges ? end : fileSize, fileSize);
                            if (supportsRanges && end < fileSize) downloadRange(end);
                        }, 200);
                    } else getXHR.onerror();
                };
                getXHR.onprogress = function updateProgress(evt) {

                    if (isCanceled[url]) {

                        getXHR.abort();
                        delete isCanceled[url];
                        var error = new Error('download canceled');
                        error.code = 'downloadCanceled';
                        completed(null, start, fileSize, error);
                    } else {

                        downloadProgress(start + evt.loaded, 2 * fileSize);
                    }
                };
                getXHR.send();
            };
            if (er) completed(null, 0, fileSize, er);
            else if (fileSize > 0) downloadRange(startByte || 0);
        });
    };
    self.downloadResource = function(resource, resume, callback) {

        var cancel = null;
        load(function() {

            var fileSizeLimit = (device.platform.toLowerCase() === 'ios' ? 50 : 100) * 1024 * 1024;
            if (resource.bytesLength > fileSizeLimit) {

                var error = new Error('file size exceeded limit ' + fileSizeLimit + ' bytes');
                error.code = 'overLimit';
                error.fileSizeLimit = fileSizeLimit;
                callback(false, 0, error);
                return;
            }
            var downloadProgress = resource.downloadProgress || function() {};
            if (!resource.url || resource.url.length === 0) {

                throw new Error('Invalid resource');
            } else {

                resource.url = encodeURI(resource.url);
            }
            var path = null;
            var queue = [];
            switch (resource.type) {

                case ResourceType.IMAGE:
                    path = getUserImagePath(resource.username);
                    break;
                case ResourceType.RESOURCE:
                    path = getUserResourcePath(resource.username);
                    break;
                default:
                    throw new Error('Invalid resource Type');
            }
            if (path) {

                var urlComponents = resource.url.split('/');
                path += urlComponents[urlComponents.length - 1];
                var beginDownload = function(startByte) {

                    download(resource.url, startByte, downloadProgress, function(data, loaded, total, er) {

                        queue[queue.length] = data;
                        if (!er) {

                            if (queue[0] && queue[0].size > 0) {

                                if (cancel === null) {

                                    var size = queue[0].size;
                                    var writeCompletion = function(success, err) {

                                        if (!success || err) {

                                            queue = [];
                                            if (window.cleanURLCache) window.cleanURLCache([]);
                                            callback(false, loaded, err || new Error('file write failed'));
                                        } else {

                                            resource.path = cacheFileSystem.removeRootPath(path);
                                            downloadProgress(loaded + size, 2 * total);
                                            if (loaded == total) {

                                                if (resource.data !== undefined) cacheFileSystem.readFile(path, function(fileData, e) {

                                                    resource.data = fileData;
                                                    if (window.cleanURLCache) window.cleanURLCache([]);
                                                    callback(true, total, e || err);
                                                });
                                                else {

                                                    if (window.cleanURLCache) window.cleanURLCache([]);
                                                    callback(true, total, err);
                                                }
                                            }
                                            if (queue[0] && queue[0].size > 0) {

                                                size = queue[0].size;
                                                cancel = cacheFileSystem.writeFile(path, queue.splice(0, 1)[0], writeCompletion);
                                            } else {

                                                cancel = null;
                                            }
                                        }
                                    };
                                    cancel = cacheFileSystem.writeFile(path, queue.splice(0, 1)[0], writeCompletion);
                                }
                            } else {

                                queue = [];
                                if (window.cleanURLCache) window.cleanURLCache([]);
                                callback(false, loaded, new Error('file downloaded chunck is zero bytes'));
                            }
                        } else {

                            queue = [];
                            if (window.cleanURLCache) window.cleanURLCache([]);
                            callback(false, loaded, er);
                        }
                    });
                };
                cacheFileSystem.isFileExisted(path, function(existed, file, error) {

                    if (existed) {

                        var size = file ? file.size : 0;
                        resource.path = cacheFileSystem.removeRootPath(path);
                        var checkResume = function(fileSize) {

                            if (resource.data !== undefined || fileSize) cacheFileSystem.readFile(path, function(fileData, err) {


                                if (fileSize > size) {

                                    beginDownload(size);
                                } else {

                                    if (resource.data !== undefined) resource.data = fileData;
                                    callback(true, size, err || error);
                                }
                            });
                            else callback(true, size, error);
                        };
                        if (resume) {

                            getHead(resource.url, function(fileSize) {

                                checkResume(fileSize);
                            });
                        } else {

                            checkResume(0);
                        }
                    } else if (!error || error.message === 'Not found error') {

                        beginDownload(0);
                    } else callback(false, 0, error);
                });
            }
        });
        return function() {

            isCanceled[resource.url] = true;
            if (cancel) {

                cancel();
                cancel = null;
            }
        };
    };
};

module.exports.CacheController = CacheController;
