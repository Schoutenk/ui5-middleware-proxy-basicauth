# ui5-middleware-proxy-basicauth

UI5 Middleware Proxy with Basic auth

Middleware for [ui5-server](https://github.com/SAP/ui5-server), enabling proxy support.

This is an extension for the simple proxy created by @pmuessig (https://github.com/petermuessig/ui5-ecosystem-showcase).

## Install

```bash
npm install ui5-middleware-proxy-basicauth --save-dev
```

## Configuration options (in `$yourapp/ui5.yaml`)

- baseUri: `string`
  the baseUri to proxy

## Usage

1. Define the dependency in `$yourapp/package.json`:

```json
"devDependencies": {
    "ui5-middleware-proxy-basicauth": "*"
},
"ui5": {
  "dependencies": [
    "ui5-middleware-proxy-basicauth"
  ]
}
```

> As the devDependencies are not recognized by the UI5 tooling, they need to be listed in the `ui5 > dependencies` array. In addition, once using the `ui5 > dependencies` array you need to list all UI5 tooling relevant dependencies.

2. configure it in `$yourapp/ui5.yaml`:

```yaml
server:
  customMiddleware:
  - name: ui5-middleware-proxy-basicauth
    afterMiddleware: compression
    mountPath: /odata
    configuration:
      baseUri: "http://services.odata.org"
      client: "110"
```

3. Set your username and password in your .env file
PROXY_USERNAME=yourusername
PROXY_PASSWORD=yourpassword

## How it works

The middleware launches a `proxy`-server which proxies the requests to the given uri. Internally, it uses the http-proxy middleware.