const environment = {
    "REQUEST_URL": "${RequestUrl}",
    "REQUEST_SIGNATURE": "${RequestSignature}",
    "AWS_REGION": "${AwsRegion}",
    "LAMBDA_FUNCTION_NAME": "${LambdaFunctionName}"
};

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
