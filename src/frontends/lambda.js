const environment = JSON.parse(require('fs').readFileSync("environment.json"));

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
            if (newRequest.headers) {
                for (var key in newRequest.headers) {
                    request.headers[key.toLowerCase()] = [{
                        key: key,
                        value: newRequest.headers[key]
                    }];
                }
            }
            callback(null, request);
        } else
            callback(null, { status: response.status });
    });
};
