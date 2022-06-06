const signUri = function (environment, uri) {
    if (!environment.REQUEST_SIGNATURE || environment.REQUEST_SIGNATURE.length === 0)
        return uri;
    const Crypto = require("crypto");
    uri = uri + "?nonce=" + Crypto.randomBytes(32).toString('hex') + "&timestamp=" + ((new Date()).getTime() + 5 * 60 * 1000);
    uri = uri + "&signature=" + Crypto.createHmac("sha224", environment.REQUEST_SIGNATURE).update("POST " + uri).digest("hex");
    return uri;
};

const AWS = require('aws-sdk');

const requestResponse = function (environment, request, callback) {
    console.log(request);
    var uri = environment.REQUEST_URL.replace("%uri%", request.uri).replace("%method%", request.method.toLowerCase());
    uri = signUri(environment, uri);
    console.log("POST " + uri);
    var parsed = require('url').parse(uri);
    var data = JSON.stringify(request);
    AWS.config.region = environment.AWS_REGION;
    const lambda = new AWS.Lambda();
    lambda.invoke({
        FunctionName: environment.LAMBDA_FUNCTION_NAME,
        InvocationType: "RequestResponse",
        LogType: "Tail",
        Payload: JSON.stringify({
            httpMethod: "POST",
            path: parsed.pathname,
            headers: {
                "X-Forwarded-For": request.clientIp,
                Host: parsed.hostname,
                'Content-Type': 'application/json',
                'Content-Length': data.length
            },
            queryStringParameters: parsed.query,
            body: data
        })
    }, function (err, data) {
        if (err || data.StatusCode !== 200) {
            callback({status: err ? 500 : data.StatusCode}, null);
            return;
        }
        try {
            data = JSON.parse(data.Payload);
        } catch (e) {
        }
        if (!data.statusCode) {
            callback({status: 500}, null);
            return;
        }
        if (200 <= data.statusCode && data.statusCode < 300) {
            try {
                const result = JSON.parse(data.body.trim());
                console.log("Response", data.statusCode, result);
                try {
                    callback(null, result);
                } catch (e) {}
            } catch (e) {
                console.log("Response", 500);
                callback({status: 500}, null);
            }
        } else {
            console.log("Response", data.statusCode);
            var headers = {};
            if (data.headers)
                for (var key in data.headers)
                    if (key.toLowerCase() === 'www-authenticate')
                        headers[key] = data.headers[key];
            callback({status: data.statusCode, headers: headers}, null);
        }
    });
};
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
