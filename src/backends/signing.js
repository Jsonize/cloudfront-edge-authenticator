const signUri = function (environment, uri) {
    if (!environment.REQUEST_SIGNATURE)
        return uri;
    const Crypto = require("crypto");
    uri = uri + "?nonce=" + Crypto.randomBytes(32).toString('hex') + "&timestamp=" + ((new Date()).getTime() + 5 * 60 * 1000);
    uri = uri + "&signature=" + Crypto.createHmac("sha224", environment.REQUEST_SIGNATURE).update("POST " + uri).digest("hex");
    return uri;
};
