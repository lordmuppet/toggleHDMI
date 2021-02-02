var express = require("express");
var bodyParser = require("body-parser");
var routes = require("./routes/routes.js");
const https = require("https");
const fs = require("fs");
const helmet = require("helmet");

const SSL_LOCATION = process.env.SSL_LOCATION ? process.env.SSL_LOCATION : '/etc/ssl/certs';

const options = {
  key: fs.readFileSync(SSL_LOCATION + "/my-site-key.pem"),
  cert: fs.readFileSync(SSL_LOCATION + "/my-site-cert.pem")
};

var app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(helmet()); // Add Helmet as a middleware
app.use(express.static('public'))
app.use('/.well-known/pki-validation/', express.static('public'))

routes(app);

var server = app.listen(18080, function () {
    console.log("app running on port.", server.address().port);
});

https.createServer(options, app).listen(18443);