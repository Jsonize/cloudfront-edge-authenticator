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