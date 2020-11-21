var environment = JSON.parse(require('fs').readFileSync("environment.json"));

if (process.argv[2])
    environment = environment[process.argv[2]];

function readRangeHeader(range, totalLength) {
    if (range == null || range.length == 0)
        return null;

    var array = range.split(/bytes=([0-9]*)-([0-9]*)/);
    var start = parseInt(array[1]);
    var end = parseInt(array[2]);
    var result = {
        Start: isNaN(start) ? 0 : start,
        End: isNaN(end) ? (totalLength - 1) : end
    };

    if (!isNaN(start) && isNaN(end)) {
        result.Start = start;
        result.End = totalLength - 1;
    }

    if (isNaN(start) && !isNaN(end)) {
        result.Start = totalLength - end;
        result.End = totalLength - 1;
    }

    return result;
}

require('http').createServer(function (request, response) {
    const headers = {};
    for (var i = 0; i < request.rawHeaders.length; i += 2)
        headers[request.rawHeaders[i]] = request.rawHeaders[i+1];
    const uriIdx = request.url.indexOf("?");
    var uri = uriIdx >= 0 ? request.url.substring(0, uriIdx) : request.url;
    const method = request.method.toUpperCase();
    requestResponse(environment, {
        clientIp: request.connection.remoteAddress,
        method: method,
        queryString: uriIdx >= 0 ? request.url.substring(uriIdx + 1) : "",
        uri: uri,
        host: headers.Host,
        headers: headers
    }, function (retResponse, newRequest) {
        if (newRequest) {
            if ('uri' in newRequest)
                uri = newRequest.uri;
            /*
            This would ONLY forward the headers to the ORIGIN. That's not what we want here.

            if (newRequest.headers) {
                for (var key in newRequest.headers)
                    response.setHeader(key, newRequest.headers[key]);
            }
             */
            const fileName = environment.FILE_BASE.replace("%", uri);
            const FS = require('fs');

            if (!FS.existsSync(fileName)) {
                response.statusCode = 404;
                response.end();
                return;
            }

            response.setHeader("Content-Type", require("mime-types").lookup(fileName));
            response.setHeader("Accept-Ranges", "bytes");

            if (method === "OPTIONS" || method === "HEAD") {
                response.statusCode = 200;
                response.end();
                return;
            }

            const stat = FS.statSync(fileName);
            const rangeRequest = readRangeHeader(headers.Range, stat.size);

            if (!rangeRequest) {
                response.statusCode = 200;
                response.setHeader("Content-Length", stat.size);
                const fullStream = FS.createReadStream(fileName);
                fullStream.on('open', function () {
                    fullStream.pipe(response);
                });
            } else {
                const start = rangeRequest.Start;
                const end = rangeRequest.End;
                if (start >= stat.size || end >= stat.size) {
                    response.statusCode = 416;
                    response.setHeader("Content-Range", 'bytes */' + stat.size);
                    response.end();
                } else {
                    response.statusCode = 206;
                    response.setHeader("Content-Range", 'bytes ' + start + '-' + end + '/' + stat.size);
                    response.setHeader("Content-Length", start >= end ? 0 : (end - start + 1));
                    response.setHeader("Content-Length", start >= end ? 0 : (end - start + 1));
                    const partialStream = FS.createReadStream(fileName, { start: start, end: end });
                    partialStream.on('open', function () {
                        partialStream.pipe(response);
                    });
                }
            }
        } else {
            response.statusCode = retResponse.status;
            if (retResponse.headers) {
                for (var key in retResponse.headers)
                    response.setHeader(key, retResponse.headers[key]);
            }
            response.end();
        }
    });
}).listen(environment.HTTP_PORT, function (error) {
    console.log(error || ("Server is listening at " + environment.HTTP_PORT));
});