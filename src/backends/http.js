const requestResponse = function (environment, request, callback) {
    console.log(request);
    var uri = environment.REQUEST_URL.replace("%uri%", request.uri).replace("%method%", request.method.toLowerCase());
    uri = signUri(environment, uri);
    console.log("POST " + uri);
    var parsed = require('url').parse(uri);
    var data = JSON.stringify(request);
    var req = (parsed.protocol.indexOf("https") === 0 ? require('https') : require('http')).request({
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.path,
        method: "POST",
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    }, function (response) {
        if (200 <= response.statusCode && response.statusCode < 300) {
            var respData = "";
            response.on('data', function (data) {
                respData += data;
            });
            response.on("end", function () {
                try {
                    const result = JSON.parse(respData.trim());
                    console.log("Response", response.statusCode, result);
                    try {
                        callback(null, result);
                    } catch (e) {}
                } catch (e) {
                    console.log("Response", 500);
                    callback({status: 500}, null);
                }
            });
        } else {
            console.log("Response", response.statusCode);
            var headers = {};
            if (response.headers)
                for (var key in response.headers)
                    if (key.toLowerCase() === 'www-authenticate')
                        headers[key] = response.headers[key];
            callback({status: response.statusCode, headers: headers}, null);
        }
    });
    req.on("error", function () {
        callback({status: 500}, null);
    });
    req.write(data);
    req.end();
};
