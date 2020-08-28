const signUri = function (environment, uri) {
    if (!environment.REQUEST_SIGNATURE)
        return uri;
    const Crypto = require("crypto");
    uri = uri + "?nonce=" + Crypto.randomBytes(32).toString('hex') + "&timestamp=" + ((new Date()).getTime() + 5 * 60 * 1000);
    uri = uri + "&signature=" + Crypto.createHmac("sha224", environment.REQUEST_SIGNATURE).update("POST " + uri).digest("hex");
    return uri;
};

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

const environment = JSON.parse(require('fs').readFileSync("environment.json"));

function mapHeaders(from, to) {
    from = from || {};
    to = to || {};
    for (var key in from) {
        to[key.toLowerCase()] = [{
            key: key,
            value: from[key]
        }];
    }
    return to;
}

exports.handler = (event, context, callback) => {
    const request = event.Records[0].cf.request;
    const headers = {};
    for (var key in request.headers) {
        request.headers[key].forEach(function (kv) {
            headers[kv.key] = kv.value;
        });
    }
    requestResponse(environment, {
        clientIp: request.clientIp,
        method: request.method,
        queryString: request.querystring,
        uri: request.uri,
        host: headers.Host,
        headers: headers
    }, function (response, newRequest) {
        if (newRequest) {
            request.clientIp = 'clientIp' in newRequest ? newRequest.clientIp : request.clientIp;
            request.method = 'method' in newRequest ? newRequest.method : request.method;
            request.queryString = 'queryString' in newRequest ? newRequest.queryString : request.queryString;
            request.uri = 'uri' in newRequest ? newRequest.uri : request.uri;
            if (!request.uri || request.uri[0] !== "/")
                request.uri = "/" + request.uri;
            mapHeaders(newRequest.headers, request.headers);
            callback(null, request);
        } else
            callback(null, {
                status: response.status,
                headers: mapHeaders(response.headers)
            });
    });
};
