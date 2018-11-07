// dependency
var hasher = require('crypto');
var config = require('./config');

// container
var helpers = {};

// functions
helpers.hash = function(data){
    if(typeof(data) == 'string' && data.length > 0){
        hashed = hasher.createHmac('sha256', config.hashingSecret).update(data).digest('hex');
        return hashed;
    } else {
        return false;
    }
};

helpers.parseJsonToObject = function(data){
    
    try {
        var obj = JSON.parse(data);
        return obj;
    } catch(e) {
        return {};
    }
};


// export
module.exports = helpers;