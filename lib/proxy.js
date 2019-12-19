// heavily inspired by https://github.com/SAP/connect-openui5/blob/master/lib/proxy.js
const url = require("url");
const httpProxy = require("http-proxy");
const dotenv = require("dotenv");

// Call dotenv, so that contents in the file are stored in the environment variables
dotenv.config();

const env = {
    noProxy: process.env.NO_PROXY || process.env.no_proxy,
    httpProxy: process.env.HTTP_PROXY || process.env.http_proxy,
    httpsProxy: process.env.HTTPS_PROXY || process.env.https_proxy,
    username: process.env.PROXY_USERNAME || process.env.proxy_username,
    password: process.env.PROXY_PASSWORD || process.env.proxy_password
};

function getProxyUri(uri) {
    if (uri.protocol === "https:" && env.httpsProxy || uri.protocol === "http:" && env.httpProxy) {
        if (env.noProxy) {
            const canonicalHost = uri.host.replace(/^\.*/, ".");
            const port = uri.port || (uri.protocol === "https:" ? "443" : "80");

            const patterns = env.noProxy.split(",");
            for (let i = patterns.length - 1; i >= 0; i--) {
                let pattern = patterns[i].trim().toLowerCase();

                // don"t use a proxy at all
                if (pattern === "*") {
                    return null;
                }

                // Remove leading * and make sure to have exact one leading dot (.)
                pattern = pattern.replace(/^[*]+/, "").replace(/^\.*/, ".");

                // if host ends with pattern, no proxy should be used
                if (canonicalHost.indexOf(pattern) === canonicalHost.length - pattern.length) {
                    return null;
                }
            }
        }

        if (uri.protocol === "https:" && env.httpsProxy) {
            return uri.href;
        } else if (uri.protocol === "http:" && env.httpProxy) {
            return uri.href;
        }
    }

    return null;
}

function buildRequestUrl(uri, options) {
    let ret = uri.pathname;
    if (uri.query) {
        ret += "?" + uri.query;
    }
    if (options.configuration.client) {
        ret += (uri.query) ? '&' : '?';
        ret += 'sap-client=' + options.configuration.client;
    }
    return ret;
}

function createUri(uriParam, baseUri) {
    return url.parse(baseUri + uriParam);
}

module.exports = function({resources, options}) {
    let proxyServerParameters = {};

    proxyServerParameters.auth = env.username + ":" + env.password;
    if (options.configuration.auth) {
        proxyServerParameters.auth = options.configuration.auth;
    }

    proxyServerParameters.secure = false;
    let proxy = httpProxy.createProxyServer(proxyServerParameters);

    return function serveResources(req, res, next) {
        if (options.configuration.baseUri == undefined) {
            return next();
        }
        let uri = createUri(req.url, options.configuration.baseUri);
        if (!uri || !uri.host) {
            next();
            return;
        }

        // change original request url to target url
        req.url = buildRequestUrl(uri, options);
        // change original host to target host
        req.headers.host = uri.host;

        // overwrite response headers
        res.orgWriteHead = res.writeHead;
        res.writeHead = function (...args) {
            // We always filter the secure header to avoid the cookie from
            //	"not" beeing included in follow up requests in case of the
            //	proxy is running on HTTP and not HTTPS
            let cookies = res.getHeader("set-cookie");
            // array == multiple cookies
            if (Array.isArray(cookies)) {
                for (let i = 0; i < cookies.length; i++) {
                    cookies[i] = cookies[i].replace("secure;", "");
                }
            } else if (typeof cookies === "string" || cookies instanceof String) {
                // single cookie
                cookies = cookies.replace("secure;", "");
            }

            if (cookies) {
                res.setHeader("set-cookie", cookies);
            }

            // call original writeHead function
            res.orgWriteHead(args);
        };

        // get proxy for uri (if defined in env vars)
        let targetUri = getProxyUri(uri) || uri.protocol + "//" + uri.host;
        // proxy the request
        proxy.proxyRequest(req, res, {
            target: targetUri
        }, function (err) {
            if (err) {
                next(err);
            }
        });
    };
}
