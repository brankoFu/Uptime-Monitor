// Application entry point

// Dependencies
var http = require('http');
var url = require('url');
var StringDecoder = require('string_decoder').StringDecoder;

// Create server
var server = http.createServer(function(req, res) {

    // Get the url and parse it
    var parsedUrl = url.parse(req.url, true);

    // Get the path
    var path = parsedUrl.pathname;
    var trimmedPath = path.replace(/^\/+|\/+$/g, '');

    // Get the query string as object
    var queryStringObject = parsedUrl.query;

    // Get the method
    var method = req.method.toLowerCase();

    // Get the headers
    var headers = req.headers;

    // Get the payload
    var decoder = new StringDecoder('utf-8');
    var buffer = '';
   
    req.on('data', function(data) {
        buffer += decoder.write(data);
    });

    req.on('end', function() {
        buffer += decoder.end();

        // Choose handler for request handling
        var chosenHandler = typeof(router[trimmedPath]) !== 'undefined' ? router[trimmedPath] : handlers.notFound;

        // Construct data object to send to handler
        var data = {
            'path' : trimmedPath,
            'query' : queryStringObject,
            'method' : method,
            'headers' : headers,
            'payload' : buffer
        }

        // Route request to choosen handler
        chosenHandler(data, function(statusCode, resPayload) {
            statusCode = typeof(statusCode) == 'number' ? statusCode : 200;
            resPayload = typeof(resPayload) == 'object' ? resPayload : {};

            payloadString = JSON.stringify(resPayload);

            // Return response
            res.writeHead(statusCode);
            res.end(payloadString);
        });

    });
    
});

// Start server and listen on port 3000
server.listen(3000, function() {
    console.log("Server is listening on port 3000...");
});

// Define the handlers
var handlers = {};

// Sample handler
handlers.sample = function(data, callback) {
    callback(406, { 'name' : 'foo' });
};

// Not Found handler
handlers.notFound = function(data, callback) {
    callback(404);
};

// Define the request router
var router = {
    'sample' : handlers.sample
};
