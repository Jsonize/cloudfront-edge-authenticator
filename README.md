# cloudfront-edge-authenticator

Callback-Authentication from CloudFront Edge Viewer.

## Local Setup

Create file `environment.json`:
```
{
  "enviroment-identifier": {
    "REQUEST_URL": "http://localhost:2396/cdnedge%uri%",
    "FILE_BASE": "/foo/bar/%",
    "HTTP_PORT": "7342"
  }
}
```

This will forward requests to a server running at that url. You can launch a local setup like so:

```
    node dist/local_to_http.js environment-identifier
```

## Building

- Build JS: `gulp`
- Build CloudFormation: `npm run compile-cloudformation`
- Deploy CloudFormation: `npm run deploy-cloudformation`

## AWS Deployment

Via CloudFormation and the templates included in `dist`.