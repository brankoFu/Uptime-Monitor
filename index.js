// Application entry point

// Dependencies
var http = require('http');
var url = require('url');

// Create server
var server = http.createServer(function(req, res) {

    // Get the url and parse it
    var parsedUrl = url.parse(req.url, true);

    // Get the path
    var path = parsedUrl.pathname;
    var trimmedPath = path.replace(/^\/+|\/+$/g, '');

    // Send the response
    res.end('Hello World!');

    // Log the path
    console.log('User requested path: ' + trimmedPath);

});

// Start server and listen on port 3000
server.listen(3000, function() {
    console.log("Server is listening on port 3000...");
});