
var handlers = {}
var _data = require('./data');
var helpers = require('./helpers');

handlers.sample = function(data, callback){
    callback(406, {"sample": "sample handler"});
};
handlers.notFound = function(data, callback){
    callback(404);
};
handlers.ping = function(data, callback){
    callback(200);
};
handlers.hello = function(data, callback){        
    friend_name = "stranger";
    data_received = JSON.parse(data.payload);
    if (data_received.hasOwnProperty("name")) {
        friend_name = data_received["name"];
    }

    sv_response = {"hi": friend_name}
    callback(200, sv_response);
};

handlers.users = function(data, callback){
    var acceptableMethods = ['post', 'get', 'put', 'delete']
    if(acceptableMethods.indexOf(data.method) > -1){
        handlers._users[data.method](data, callback);
    } else {
        callback(405);
    }
};

// containers for users method
handlers._users = {}
// the other methods for users handlers. 
// required: firstName, lastName, phone, password, tosAgreement
handlers._users.post = function(data, callback){
    // check required data exist
    var firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
    var lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
    var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
    var tosAgreement = typeof(data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement == true ? true : false;

    if(firstName && lastName && phone && password && tosAgreement){
        // phone must unique
        _data.read('users', phone, function(err, data){
            if(err){
                var hashedPassword = helpers.hash(password);
                if (!hashedPassword){
                    callback(500, {'Error': 'Failed to hash the password'});
                } else {
                    // create user object
                    var userObject = {
                        'firstName': firstName,
                        'lastName': lastName,
                        'phone': phone,
                        'hashedPassword': hashedPassword,
                        'tosAgreement': true,
                    };
                    
                    // store the user
                    _data.create('users', phone, userObject, function(err){
                        if(!err){
                            callback(200);
                        } else {
                            console.log(err);
                            callback(500, {'Error': 'Could not create user file'});
                        }
                    });
                }
            } else {
                callback(400, {'Error': 'phone already exist!'});
            }
        });
        
    } else {
        callback(400, {'Error': 'missing required fields!'});
    }
};

// requried : phone
// only authenticated user can access their own object, not anyone else
handlers._users.get = function(data, callback){
    // check phone is valid
    var phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length >= 10 ? data.queryStringObject.phone : false;
    if(phone){
        // check whose the user
        _data.read('users', phone, function(err, data){
            if(!err && data){
                // remove hashed password from user before returning to the requester
                delete data.hashedPassword;
                callback(200, data);
            } else {
                callback(404);
            }
        });
    } else {
        callback(400, {'Error': 'missing required fields!'});
    }
};

// required = phone
// optional = first/last name, password (at least one need to be there)
// only auth user can update their own data, not everyone else
handlers._users.put = function(data, callback){
    console.log(data);
    var firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
    var lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
    var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
    
    if(phone){
        if(firstName || lastName || password){
            // check whose the user
            _data.read('users', phone, function(err, userObject){
                if(!err && userObject){

                    if(firstName){
                        userObject.firstName = firstName;
                    }
                    if(lastName){
                        userObject.lastName = lastName;
                    }
                    if(password){
                        userObject.password = helpers.hash(password);
                    }
                    
                    // update time
                    _data.update('users', phone, userObject, function(err, callback){
                        if(err){
                            callback(200);
                        } else {
                            console.log(err);
                            callback(500, {'Error': 'Could not update the user!'});
                        }
                    });
                    
                    callback(200, true);
                } else {
                    callback(404, {'Error': 'This user does not exist!'});
                }
            });

        } else {
            callback(400, {'Error': 'missing 1 optional field!'});
        }
    } else {
        callback(400, {'Error': 'missing required fields!'});
    }
};

// require = phone
// only auth user can delete their own data, not everyone else
// delete everything elses
handlers._users.delete = function(data, callback){
    // check phone is valid
    var phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length >= 10 ? data.queryStringObject.phone : false;
    if(phone){
        // check whose the user
        _data.read('users', phone, function(err, data){
            if(!err && data){
                // remove hashed password from user before returning to the requester
                _data.delete('users', phone, function(err){
                    if(!err){
                        callback(200);
                    } else {
                        callback(500, {'Error': 'Could not delete this user!'});
                    }
                });
                callback(200, data);
            } else {
                callback(404);
            }
        });
    } else {
        callback(400, {'Error': 'missing required fields!'});
    }
};

module.exports = handlers