var fs = require('fs');
var path = require('path');

// container
var lib = {};
lib.baseDir = path.join(__dirname, '/../data/');

// write data to a file
lib.create = function(dir, file, data, callback){
    fs.open(lib.baseDir+dir+'/'+file+'.json', 'wx', function(err, fileDescriptor){
        if (!err && fileDescriptor){
            var stringData = JSON.stringify(data);

            // write
            fs.writeFile(fileDescriptor, stringData, function(err){
                if(!err){
                    fs.close(fileDescriptor, function(err){
                        if(!err){
                            callback(false);
                        } else {
                            callback('error closing new file');
                        }
                    });
                } else {
                    callback('Error writing to new file');
                }
            });
        } else {
            callback('could not create new file, it may already exist');
        }
    });
};

// read data from file
lib.read = function(dir, file, callback){
    fs.readFile(lib.baseDir+dir+'/'+file+'.json', 'utf8', function(err, data){
        callback(err, data);
    });
};

// update data inside ae file

lib.update = function(dir, file, data, callback){
    fs.open(lib.baseDir+dir+'/'+file+'.json', 'r+', function(err, fileDescriptor){
        if (!err && fileDescriptor){
            var stringData = JSON.stringify(data);

            // truncate
            fs.truncate(fileDescriptor, function(err){
                if(!err){

                    // write
                    fs.writeFile(fileDescriptor, stringData, function(err){
                        if(!err){
                            fs.close(fileDescriptor, function(err){
                                if(!err){
                                    callback(false);
                                } else {
                                    callback('error closing new file');
                                }
                            });
                        } else {
                            callback('Error writing to file');
                        }
                    });
                } else {
                    callback('Error truncating the file');
                }
            });
        } else {
            callback('could not open the file, it may not exist yet');
        }
    });
};

lib.delete = function(dir, file, callback){
    // unlink
    fs.unlink(lib.baseDir+dir+'/'+file+'.json', function(err, fileDescriptor){
        if(!err){
            callback(false);
        } else {
            callback('error closing new file');
        }
    });
};

module.exports = lib;