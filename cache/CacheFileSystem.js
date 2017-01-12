/*jslint node: true */
/*global window*/
/*global document*/
/*global LocalFileSystem*/
/*global FileReader*/
/*global device*/
/*global Windows*/
'use strict';

var ErrorCodes = {

    1: 'Not found error',
    2: 'Security error',
    3: 'Abort error',
    4: 'Not readable error',
    5: 'Encoding error',
    6: 'No modification allowed error',
    7: 'Invalid state error',
    8: 'Syntax error',
    9: 'Invalid modification error',
    10: 'Quota exceeded error',
    11: 'Type mismatch error',
    12: 'Path exists error'
};

var deviceready = false;

var CacheFileSystem = function(cb) {

    var self = this;
    var fileSystem = null;
    var isCanceled = {};
    var load = function(callback) {

        window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function(fs) {

            fileSystem = fs;
            if (typeof callback === 'function') callback();
        }, function(error) {

            if (typeof callback === 'function') callback(new Error(ErrorCodes[error.code]));
        });
    };
    if (!deviceready) document.addEventListener('deviceready', function() {

        deviceready = true;
        load(cb);
    });
    else load(cb);
    self.getRootPath = function() {

        var nativePath = fileSystem.root.toInternalURL();
        return nativePath;
    };
    var getDirectory = function(pathComponents, create, callback) {

        var fail = function(error) {

            callback(null, new Error(ErrorCodes[error.code]));
        };
        var checkDir = function(dirEntry, index) {

            dirEntry.getDirectory(pathComponents[index], {

                create: create,
                exclusive: false
            }, function(directoryEntry) {

                if (directoryEntry) {

                    if (index + 1 < pathComponents.length) {

                        checkDir(directoryEntry, index + 1);
                    } else {

                        callback(directoryEntry);
                    }
                } else {

                    fail({
                        code: 1
                    });
                }
            }, fail);
        };
        checkDir(fileSystem.root, 0);
    };
    self.readFile = function(path, callback) {

        var fail = function(error) {

            callback(null, new Error(ErrorCodes[error.code]));
        };
        var dirs = [];
        if (device.platform.toLowerCase() !== 'windows8') dirs = (self.removeRootPath(path)).split('\/');
        else(dirs = (self.removeRootPath(path)).split('\\')).splice(0, 1);
        var filename = dirs.splice(dirs.length - 1)[0];
        if (filename) {

            getDirectory(dirs, false, function(directoryEntry, error) {

                if (error) callback(false, error);
                else if (directoryEntry) directoryEntry.getFile(filename, {

                    create: false,
                    exclusive: false
                }, function(fileEntry) {

                    fileEntry.file(function(file) {

                        var reader = new FileReader();
                        reader.onloadend = function(evt) {

                            if (evt.target.result) callback(evt.target.result, null);
                            else fail({
                                code: 12
                            });
                        };
                        reader.readAsDataURL(file);
                    }, fail);
                }, fail);
            });
        }
    };
    var writeFileWindows8 = function(path, data, callback) {

        var fail = function(error) {

            callback(false, new Error(ErrorCodes[error.code]));
        };
        Windows.Storage.StorageFolder.getFolderFromPathAsync(path.substring(0, path.lastIndexOf('\\'))).done(function(storageFolder) {

            storageFolder.createFileAsync(path.split('\\').pop(), Windows.Storage.CreationCollisionOption.openIfExists).done(function(storageFile) {

                storageFile.openAsync(Windows.Storage.FileAccessMode.readWrite).done(function(output) {

                    var input = data.msDetachStream();
                    Windows.Storage.Streams.RandomAccessStream.copyAsync(input, output).then(function() {

                        output.flushAsync().done(function() {

                            input.close();
                            output.close();
                            callback(true, null);
                        }, function() {

                            fail({
                                code: 9
                            });
                        });
                    }, function() {

                        fail({
                            code: 9
                        });
                    });
                }, function() {

                    fail({
                        code: 9
                    });
                });
            }, function() {

                fail({
                    code: 9
                });
            });
        }, function() {

            fail({
                code: 1
            });
        });
    };
    self.writeFile = function(path, data, callback) {

        var fail = function(error) {

            callback(false, new Error(ErrorCodes[error.code]));
        };
        var dirs = [];
        if (device.platform.toLowerCase() !== 'windows8') dirs = (self.removeRootPath(path)).split('\/');
        else(dirs = (self.removeRootPath(path)).split('\\')).splice(0, 1);
        var filename = dirs.splice(dirs.length - 1)[0];
        if (filename) {

            getDirectory(dirs, true, function(directoryEntry, error) {

                if (error) callback(false, error);
                else if (directoryEntry) directoryEntry.getFile(filename, {

                    create: true,
                    exclusive: false
                }, function(fileEntry) {

                    if (device.platform.toLowerCase() !== 'windows8') {

                        fileEntry.createWriter(function(writer) {

                            var write = function(start) {

                                if (isCanceled[path]) {

                                    delete isCanceled[path];
                                    return;
                                }
                                var SEGMENTSIZE = (device.platform.toLowerCase() === 'ios' ? 2 : 5) * 1024 * 1024;
                                var end = start + SEGMENTSIZE;
                                if (end > data.size) {

                                    end = data.size;
                                }
                                data.slice = data.slice || data.webkitSlice;
                                var blob = data.size <= SEGMENTSIZE ? data : data.slice(start, end, data.type);
                                writer.onwriteend = function(evt) {

                                    if (evt.target.error === null) {

                                        if (end === data.size) {

                                            if (device.platform.toLowerCase() === 'ios') {

                                                fileEntry.setMetadata(null, null, {

                                                    'com.apple.MobileBackup': 1
                                                });
                                            }
                                            callback(true, null);
                                        } else {

                                            window.setTimeout(function() {

                                                write(end);
                                            }, 200);
                                        }
                                    } else fail(evt.target.error);
                                };
                                writer.write(blob);
                            };
                            writer.seek(writer.length);
                            write(0);
                        }, fail);
                    } else {

                        writeFileWindows8(path, data, callback);
                    }
                }, fail);
            });
        }
        return function() {

            isCanceled[path] = true;
        };
    };
    self.removeRootPath = function(path) {

        return path.replace(self.getRootPath(), '');
    };
    self.isFileExisted = function(path, callback) {

        var dirs = [];
        if (device.platform.toLowerCase() !== 'windows8') dirs = (self.removeRootPath(path)).split('\/');
        else(dirs = (self.removeRootPath(path)).split('\\')).splice(0, 1);
        var filename = dirs.splice(dirs.length - 1)[0];
        if (filename) {

            getDirectory(dirs, false, function(directoryEntry, error) {

                if (error) callback(false, null, error);
                else if (directoryEntry) directoryEntry.getFile(filename, {

                    create: false,
                    exclusive: false
                }, function(fileEntry) {

                    callback(true, fileEntry.file, null);
                }, function() {

                    callback(false, null, null);
                });
            });
        }
    };
};

module.exports.CacheFileSystem = CacheFileSystem;
