var path = require("path");
var dateFormat = require('dateformat');
var FindMyFriends = require('../shared/findmyfriends.js');
var mustache = require('mustache');
var isSecretValid = require('../shared/functions.js').isSecretValid;
var getLocations = require('../shared/functions.js').getLocations;
var getAqi = require('../shared/functions.js').getAqi;
var fs = require("fs");
require('dotenv').config();

global.currentDay = Date.now();
global.mostRecentPackage;
global.numberPackages = 0;

var appRouter = function (app) {

    app.get("/rpihdmi/off", function (req, res) {

        if (!isSecretValid(req)) {
            res.status(401).send("Unauthorized");
            return;
        }

        const exec = require('child_process').exec;
        var turnoff = exec('sh rpi-hdmi.sh off',
            (error, stdout, stderr) => {
                console.log(`${stdout}`);
                console.log(`${stderr}`);
                if (error !== null) {
                    console.log(`exec error: ${error}`);
                }
            });

        res.status(200).send("Display turned off!");
    });

    //
    // Static map from LocationIQ with markers
    //
    app.get("/locationsmap", async (req, res, next) => {
        if (!isSecretValid(req)) {
            res.status(401).send("Unauthorized");
            return;
        }
        // Fetch location data without street addresses
        const outputView = await getLocations(false);
        // // Build marker parameters
        const markerParams = outputView.locations
            .map(loc => `&markers=${loc.lat},${loc.long}|icon:tiny-purple-cutout`)
            .join("");

        // Construct static map URL
        const apiKey = process.env.LOCATION_IQ_TOKEN;
        const size = "320x320";
        const zoom = process.env.LOCATIONIQ_ZOOM || "5";
        const mapUrl = `https://maps.locationiq.com/v3/staticmap?key=${apiKey}&maptype=light&size=${size}&zoom=${zoom}$&format=jpg${markerParams}`;
        
        // Allow framing from whitelisted domain
        res.header('X-FRAME-OPTIONS', 'ALLOW-FROM ' + process.env.DOMAIN_WHITELIST);
        // Allow maps.locationiq.com in Content Security Policy
        res.header('Content-Security-Policy', "default-src 'self'; frame-src 'self' https://maps.locationiq.com; img-src 'self' https://maps.locationiq.com;");
        // Return the iframe with the static map
        const mapImage = `<img width="320" height="320" frameBorder="0" allowtransparency="true" src="${mapUrl}"></img>`;
        res.status(200).send(mapImage);
    });

    app.get("/rpihdmi/on", function (req, res) {

        if (!isSecretValid(req)) {
            res.status(401).send("Unauthorized");
            return;
        }

        const exec = require('child_process').exec;
        var turnoff = exec('sh rpi-hdmi.sh on',
            (error, stdout, stderr) => {
                console.log(`${stdout}`);
                console.log(`${stderr}`);
                if (error !== null) {
                    console.log(`exec error: ${error}`);
                }
            });
        res.status(200).send("Display turned on!");
    });

    app.get("/map", function (req, res) {
        res.sendFile(path.join(__dirname + '/map.html'));
    });

    //
    // Get the locations of all our devices
    //
    app.get("/locations", async (req, res, next) => {

        if (!isSecretValid(req)) {
            res.status(401).send("Unauthorized");
            return;
        }

        // Create output template that has repeating rows for locations
        var output_template = "<table>{{#locations}}" +
            "<tr><td class='name'>{{{name}}}</td><td class='at'>@</td>" +
            "<td class='location'>{{{location}}}</td></tr>" +
            "{{/locations}}</table>";

        // Get locations with street addresses
        const outputView = await getLocations(true);

        // Join the locations to the return template
        var output = mustache.render(output_template, outputView);


        // If the domain matches, allow iframes from that domain
        res.header('X-FRAME-OPTIONS', 'ALLOW-FROM ' + process.env.DOMAIN_WHITELIST);

        res.status(200).send(output);
    });

    //
    // Get a map with the locations of our devices pinned on (uses Google) - Archived
    //
    // app.get("/locationsmap", async (req, res, next) => {

    //     if (!isSecretValid(req)) {
    //         res.status(401).send("Unauthorized");
    //         return;
    //     }
    //     var output_template = fs.readFileSync("./routes/locationmap.html", 'utf8');

    //     // Get locations without street addresses
    //     const outputView = await getLocations(false);

    //     if (outputView.allAtPoi === true || process.env.SHOW_MAP === 'false') {
    //         // If the domain matches, allow iframes from that domain
    //         res.header('X-FRAME-OPTIONS', 'ALLOW-FROM ' + process.env.DOMAIN_WHITELIST);
    //         res.status(200).send("");
    //     } else {

    //         outputView.apiKey = process.env.GOOGLE_MAPS_API_KEY;

    //         // Join the locations to the return template
    //         var output = mustache.render(output_template, outputView);

    //         // Create an iframe as the MMM-REST table won't show it otherwise
    //         var iframe = "<iframe width='320' height='320' frameBorder='0'  allowtransparency='true' srcdoc=\"" + output + "\"></iframe>";

    //         // If the domain matches, allow iframes from that domain
    //         res.header('X-FRAME-OPTIONS', 'ALLOW-FROM ' + process.env.DOMAIN_WHITELIST);

    //         res.status(200).send(iframe);
    //     }

    // });

    app.get("/packages", function (req, res) {

        if (!isSecretValid(req)) {
            res.status(401).send("Unauthorized");
            return;
        }

        // Reset the package count when we go past midnight
        if (dateFormat(currentDay, "dd") !== dateFormat(Date.now(), "dd")) {
            currentDay = Date.now();
            numberPackages = 0;
            mostRecentPackage = null;

            // Return nothing
            res.status(200).send("Updated the current date");
            return
        }

        if (numberPackages > 0) {
            // var string_to_return = numberPackages === 1 ? numberPackages + " package delivered today" :
            //     numberPackages + " packages delivered today";

            var string_to_return = "";

            for (i = 0; i < numberPackages; i++) {
                string_to_return = string_to_return + "<i class='fa fa-gift fa-3x'></i>";
            }
            res.status(200).send(string_to_return);
        } else {
            res.status(200).send("");
        }

    });

    app.post("/newpackage", function (req, res) {

        if (!isSecretValid(req)) {
            res.status(401).send("Unauthorized");
            return;
        }

        var subject = req.body.subject ? req.body.subject : "No subject";
        var message = req.body.message ? req.body.message : "No message";

        numberPackages = numberPackages + 1;
        mostRecentPackage = Date.now();

        res.status(200).send("Subject: " + subject + "; Message: " + message + "; Last update: " + dateFormat(mostRecentPackage, "yyyy-mm-dd h:MM:ss"));

    });

        //
    // Get the locations of all our devices
    //
    app.get("/aqi", async (req, res, next) => {

        if (!isSecretValid(req)) {
            res.status(401).send("Unauthorized");
            return;
        }

        // Get AQI
        const aqi = await getAqi();

        let aqiLevel = 'Good';
        if (aqi > 50 && aqi < 100){
            aqiLevel = 'Moderate';
        } else if (aqi > 100 && aqi < 150){
            aqiLevel = 'Unhealthy for Sensitive Groups';
        } else if (aqi > 150 && aqi < 200){
            aqiLevel = 'Unhealthy';
        } else if (aqi > 200 && aqi < 300){
            aqiLevel = 'Very Unhealthy';
        } else if (aqi > 300){
            aqiLevel = 'Hazardous';
        } 

        console.log(aqi)
        // If the domain matches, allow iframes from that domain
        res.header('X-FRAME-OPTIONS', 'ALLOW-FROM ' + process.env.DOMAIN_WHITELIST);

        res.status(200).send(`<div class="aqi"><i class='fa fa-leaf'></i> ${aqi.toString()} | ${aqiLevel}</div>`);
    });
}

module.exports = appRouter;