const concat = require('gulp-concat');
const { src, dest, parallel } = require('gulp');

function jsLambdaToHttp() {
  return src(['src/backends/signing.js', 'src/backends/http.js', 'src/frontends/lambda.js'])
      .pipe(concat('lambda_to_http.js'))
      .pipe(dest('dist'));
}

function jsLambdaToLambda() {
  return src(['src/backends/signing.js', 'src/backends/lambda.js', 'src/frontends/lambda.js'])
      .pipe(concat('lambda_to_lambda.js'))
      .pipe(dest('dist'));
}

function jsLocalToHttp() {
  return src(['src/backends/signing.js', 'src/backends/http.js', 'src/frontends/local.js'])
      .pipe(concat('local_to_http.js'))
      .pipe(dest('dist'));
}

function jsLocalToLambda() {
  return src(['src/backends/signing.js', 'src/backends/lambda.js', 'src/frontends/local.js'])
      .pipe(concat('local_to_lambda.js'))
      .pipe(dest('dist'));
}

exports.default = parallel(jsLambdaToHttp, jsLambdaToLambda, jsLocalToHttp, jsLocalToLambda);
