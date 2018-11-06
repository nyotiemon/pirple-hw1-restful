var http = require('http');
var https = require('https');
var url = require('url');
var StringDecoder = require('string_decoder').StringDecoder;
var config = require('./config');
var fs = require('fs');

var _data = require('./lib/data');

// TESTING, Delete later
// _data.create('test', 'newFile', {'foo': 'bar'}, function(err){
//     console.log('err:', err);
// });
// _data.read('test', 'newFile', function(err, data){
//     console.log('err:', err, '. data:', data);
// });
// _data.update('test', 'newFile', {'bar': 'foo'}, function(err){
//     console.log('err:', err);
// });
// _data.delete('test', 'newFile', function(err){
//     console.log('err:', err);
// });


var httpServer = http.createServer(function(req, res){
    unifiedServer(req, res);
});

httpServer.listen(config.httpPort, function(){
    console.log('HTTP server is listening on port ' + config.httpPort + ' in ' +config.envName+ ' mode');
});

var httpsServerOptions = {
    'key': fs.readFileSync('./https/key.pem'), 
    'cert': fs.readFileSync('./https/cert.pem')
};

var httpsServer = https.createServer(httpsServerOptions,function(req, res){
    unifiedServer(req, res);
});

httpsServer.listen(config.httpsPort, function(){
    console.log('HTTPS server is listening on port ' + config.httpsPort + ' in ' +config.envName+ ' mode');
});

var unifiedServer = function(req, res){
    var parsedUrl = url.parse(req.url, true);

    var path = parsedUrl.pathname;
    var trimmedPath = path.replace(/^\/+|\/+$/g, '');
    var queryStringObject = parsedUrl.query;
    var method = req.method.toLowerCase();
    var headers = req.headers;

    var decoder = new StringDecoder('utf-8');
    var buffer = '';

    req.on('data', function(data){
        buffer += decoder.write(data);
    });
    req.on('end', function(){
        buffer += decoder.end();

        var chosenHandler = typeof(router[trimmedPath]) !== 'undefined' ? router[trimmedPath] : handlers.notFound;

        var data = {
            'trimmedPath': trimmedPath,
            'queryStringObject': queryStringObject,
            'method': method,
            'headers': headers,
            'payload': buffer
        };
        
        chosenHandler(data, function(statusCode, payload){
            statusCode = typeof(statusCode) == 'number' ? statusCode : 200;
            payload = typeof(payload) == 'object' ? payload : {};

            var payloadString = JSON.stringify(payload);

            res.setHeader('Content-Type', 'application/json');
            res.writeHead(statusCode);
            res.end(payloadString);

            console.log('response:', statusCode, payloadString);
        });
    });
};

var handlers = {}
handlers.sample = function(data, callback){
    callback(406, {"sample": "sample handler"});
};
handlers.notFound = function(data, callback){
    callback(404);
};
handlers.ping = function(data, callback){
    callback(200);
}
handlers.hello = function(data, callback){        
    friend_name = "stranger";
    data_received = JSON.parse(data.payload);
    if (data_received.hasOwnProperty("name")) {
        friend_name = data_received["name"];
    }

    sv_response = {"hi": friend_name}
    callback(200, sv_response);
}

var router = {
    "ping": handlers.ping, 
    "sample": handlers.sample,
    "hello": handlers. hello
};