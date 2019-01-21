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


// create random string with given length
helpers.createRandomString = function(strLength){
    strLength = typeof(strLength) == 'number' && strLength > 0 ? strLength : false;

    if(strLength){
        var possibleCharacters = "abcdefghijklmnopqrstuvwxyz0123456789";
        var str = '';
        for(i=1; i<=strLength; i++){
            var randomCharacter = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));
            str += randomCharacter;
        }
        return str;
    } else {
        return false;
    }
};


// export
module.exports = helpers;