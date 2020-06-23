#!/bin/sh
cd dist
cat ../src/cloudformation/lambda-to-http.yaml | ufpp > lambda-to-http.yaml
cat ../src/cloudformation/lambda-to-lambda.yaml | ufpp > lambda-to-lambda.yaml
cd ..