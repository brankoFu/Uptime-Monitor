/*
 * Server-related tasks
 *
 */

// Dependencies
var http = require('http');
var https = require('https');
var url = require('url');
var StringDecoder = require('string_decoder').StringDecoder;
var config = require('./config');
var fs = require('fs');
var handlers = require('./handlers');
var helpers = require('./helpers');
var path = require('path');
var util = require('util');
var debug = util.debuglog('server');

// Instantiate the server module object
var server = {};

// Create HTTP server
server.httpServer = http.createServer(function (req, res) {
  server.unifiedServer(req, res);
});

// Create HTTPS server
server.httpsServerOptions = {
  'key': fs.readFileSync(path.join(__dirname, '/../https/key.pem')),
  'cert': fs.readFileSync(path.join(__dirname, '/../https/cert.pem'))
};
server.httpsServer = https.createServer(server.httpsServerOptions, function (req, res) {
  server.unifiedServer(req, res);
});

server.unifiedServer = function (req, res) {
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

  req.on('data', function (data) {
    buffer += decoder.write(data);
  });

  req.on('end', function () {
    buffer += decoder.end();

    // Choose handler for request handling
    var chosenHandler = typeof (server.router[trimmedPath]) !== 'undefined' ? server.router[trimmedPath] : handlers.notFound;

    // Construct data object to send to handler
    var data = {
      path: trimmedPath,
      query: queryStringObject,
      method: method,
      headers: headers,
      payload: helpers.parseJsonToObject(buffer)
    }

    // Route request to choosen handler
    chosenHandler(data, function (statusCode, resPayload) {
      statusCode = typeof (statusCode) == 'number' ? statusCode : 200;
      resPayload = typeof (resPayload) == 'object' ? resPayload : {};

      payloadString = JSON.stringify(resPayload);

      // Return response
      res.setHeader('Content-Type', 'application-json');
      res.writeHead(statusCode);
      res.end(payloadString);

      // If the response is 200, print green, otherwise print red
      if(statusCode == 200){
        debug('\x1b[32m%s\x1b[0m',method.toUpperCase()+' /'+trimmedPath+' '+statusCode);
      } else {
        debug('\x1b[31m%s\x1b[0m',method.toUpperCase()+' /'+trimmedPath+' '+statusCode);
      }
    });

  });
}

// Define the request router
server.router = {
  ping: handlers.ping,
  users: handlers.users,
  tokens: handlers.tokens,
  checks: handlers.checks
};

// Init function
server.init = function () {
  // Start HTTP server
  server.httpServer.listen(config.httpPort, function () {
    console.log('\x1b[36m%s\x1b[0m','Server is listening on port ' + config.httpPort + ' in ' + config.envName + ' environment...');
  });
  
  // Start HTTPS server
  server.httpsServer.listen(config.httpsPort, function () {
    console.log('\x1b[35m%s\x1b[0m','Server is listening on port ' + config.httpsPort + ' in ' + config.envName + ' environment...');
  });
};

// Export the module
module.exports = server;