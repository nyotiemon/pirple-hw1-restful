
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
        // get token from header
        var token = typeof(data.queryStringObject.token) == 'string'? data.queryStringObject.token : false;
        handlers._tokens.verifyToken(token, phone, function(tokenIsValid){
            if(tokenIsValid){

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
                callback(403, "Missing required token in header, or token is invalid");
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
    var firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
    var lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
    var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
    
    if(phone){
        if(firstName || lastName || password){
            // verify the token first
            var token = typeof(data.queryStringObject.token) == 'string'? data.queryStringObject.token : false;
            handlers._tokens.verifyToken(token, phone, function(tokenIsValid){
                if(tokenIsValid){
                    // check user exist
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
                        } else {
                            callback(404, {'Error': 'This user does not exist!'});
                        }
                    });
                } else {
                    callback(403, "Missing required token in header, or token is invalid");
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
        // verify the token first
        var token = typeof(data.queryStringObject.token) == 'string'? data.queryStringObject.token : false;
        handlers._tokens.verifyToken(token, phone, function(tokenIsValid){
            if(tokenIsValid){
                // check user exist
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
                    } else {
                        callback(404);
                    }
                });
            } else {
                callback(403, "Missing required token in header, or token is invalid");
            }
        });
    } else {
        callback(400, {'Error': 'missing required fields!'});
    }
};


// ------------------ TOKENS
handlers.tokens = function(data, callback){
    var acceptableMethods = ['post', 'get', 'put', 'delete']
    if(acceptableMethods.indexOf(data.method) > -1){
        handlers._tokens[data.method](data, callback);
    } else {
        callback(405);
    }
};
// container etc
handlers._tokens = {};
// required = phone, pwd
handlers._tokens.post = function(data, callback){
    console.log('fuk');
    // check required data exist
    var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
    var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

    if(phone && password){
        // find the user
        _data.read('users', phone, function(err, data){
            if(!err && data){
                var hashedPassword = helpers.hash(password);
                if (hashedPassword == data.hashedPassword){
                    var tokenId = helpers.createRandomString(20);

                    var expires = Date.now() + 1000*60*60;
                    var tokenObject = {
                        'phone': phone,
                        'id': tokenId,
                        'expires': expires
                    };

                    _data.create('tokens', tokenId, tokenObject, function(err){
                        if(!err){
                            callback(200, tokenObject);
                        } else {
                            callback(400, {'Error': 'Could not create new token'});
                        }
                    });
                } else {
                    callback(400, {'Error': 'Password not match!'});
                }
            } else {
                callback(400, {'Error': 'could not find the specified user!'});
            }
        });
        
    } else {
        callback(400, {'Error': 'missing required fields!'});
    }
};
// required = id
handlers._tokens.get = function(data, callback){
    // check id is valid
    var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length >= 20 ? data.queryStringObject.id : false;
    if(id){
        // check whose the user
        _data.read('tokens', id, function(err, data){
            if(!err && data){
                callback(200, data);
            } else {
                callback(404);
            }
        });
    } else {
        callback(400, {'Error': 'missing required fields!'});
    }
};
// required = id, extend
handlers._tokens.put = function(data, callback){
    var id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length > 0 ? data.payload.id.trim() : false;
    var extend = typeof(data.payload.extend) == 'boolean' && data.payload.extend == true ? true : false;

    if(id && extend){
        _data.read('tokens', id, function(err, tokenObject){
            if(!err && tokenObject){
                // check token is not yet expired
                if(tokenObject.expires > Date.now()){
                    // update token +1hr
                    tokenObject.expires = Date.now() + 1000 * 60 * 60;
                
                    _data.update('tokens', id, tokenObject, function(err){
                        if(!err){
                            callback(200);
                        } else {
                            console.log(err);
                            callback(500, {'Error': 'Could not update the token!'});
                        }
                    });
                } else {
                    callback(400, {'Error': 'Token has already expired!'});
                }
            } else {
                callback(400, {'Error': 'Token does not exist!'});
            }
        });
    } else {
        callback(400, {'Error': 'missing required fields or invalid payloads!'});
    }
};
// required = id
handlers._tokens.delete = function(data, callback){
    // check id is valid
    var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id : false;
    if(id){
        // check whose the user
        _data.read('tokens', id, function(err, data){
            if(!err && data){
                // remove hashed password from user before returning to the requester
                _data.delete('tokens', id, function(err){
                    if(!err){
                        callback(200);
                    } else {
                        callback(500, {'Error': 'Could not delete the token!'});
                    }
                });
            } else {
                callback(404);
            }
        });
    } else {
        callback(400, {'Error': 'missing required fields!'});
    }
};

// verify token is valid for this user
handlers._tokens.verifyToken = function(id, phone, callback){
    _data.read('tokens', id, function(err, tokenData){
        if(!err && tokenData){
            if(tokenData.phone == phone && tokenData.expires > Date.now()){
                callback(true);
            } else {
                callback(false);
            }
        } else {
            callback(false);
        }
    });
}

// ------------------ CHECKS
handlers.checks = function(data, callback){
    var acceptableMethods = ['post', 'get', 'put', 'delete']
    if(acceptableMethods.indexOf(data.method) > -1){
        handlers._checks[data.method](data, callback);
    } else {
        callback(405);
    }
};

// container etc
handlers._checks = {};

// required = protocol, url, method, successCode, timeoutSeconds
handlers._checks.post = function(data, callback){
    // validate inputs
    var protocol = typeof(data.payload.protocol) == 'string' && ['https', 'http'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
    var url = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
    var method = typeof(data.payload.method) == 'string' && ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
    var successCode = typeof(data.payload.successCode) == 'object' && data.payload.successCode instanceof Array && data.payload.successCode.length > 0 ? data.payload.url.successCode : false;
    var timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;
    
    if(protocol && url && method && successCode & timeoutSeconds){
        var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

        // look up the user by using the token
        _data.read('tokens', token, function(err, tokenData){
            if(!err && tokenData){
                var userPhone = tokenData.phone;
                
                // lookup the user data
                _data.read('users', userPhone, function(err, userData){
                    if(!err && userData){
                        var userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];

                        // verify check is less than max
                        if(userChecks.length < config.maxChecks){
                            // create random id for the check
                            var checkId = helpers.createRandomString(20);

                            // create check object and include the user's phone
                            var checkObject = {
                                'id': checkId,
                                'userPhone': userPhone, 
                                'protocol': protocol,
                                'url': url,
                                'method': method,
                                'successCode': successCode,
                                'timeoutSeconds': timeoutSeconds
                            };

                            _data.create('checks', checkId, checkObject, function(err){
                                if(!err){
                                    // add the check id to the user's object
                                    userData.checks = userChecks;
                                    userData.checkId.push(checkId);

                                    // save the new check data
                                    _data.update('users', userPhone, userData, function(err){
                                        if(!err){
                                            callback(200, checkObject);
                                        } else {
                                            callback(500, {'Error': 'Could not update the user data'});
                                        }
                                    });
                                } else {
                                    callback(500, {'Error': 'could not create the new check'});
                                }
                            });
                        } else {
                            callback(400, {'Error': 'user already has the max number of checks (' + config.maxChecks + ')'});
                        }

                    } else {
                        callback(403);
                    }
                });
                
            } else {
                callback(403);
            }
        });
        
    } else {
        callback(400, {'Error': 'missing required inputs or input are invalid!'});
    }
};

module.exports = handlers