var path = require("path");
var fetch = require('node-fetch');
var dateFormat = require('dateformat');
var iCloud = require('../shared/icloud.js');
var mustache = require('mustache');
require('dotenv').config();


global.currentDay = Date.now();
global.mostRecentPackage;
global.numberPackages = 0;

var appRouter = function (app) {
    app.get("/rpihdmi/off", function (req, res) {

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

    app.get("/rpihdmi/on", function (req, res) {

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
    app.get("/locations", function (req, res) {

        var apple_id = process.env.APPLE_ID;
        var password = process.env.APPLE_PASSWORD;
        var first_id = process.env.FIRST_ID;
        var second_id = process.env.SECOND_ID;
        var string_to_return = "";
        var getAddress = require('../shared/functions.js').getAddress;

        var output_template = "<table><tr><td class='name'>{{{first_name}}}</td><td class='at'>@</td><td class='location'>{{{first_location}}}</td></tr><tr><td class='name'>{{{second_name}}}</td><td class='at'>@</td><td class='location'>{{{second_location}}}</td></tr></table>";

        //console.log(iCloud)
        var cloud = new iCloud(apple_id, password);

        cloud.getLocations(function (err, result) {
            //console.log(err, result)

            var locations = result.locations;

            var first_location = locations.filter(obj => {
                return obj.id === first_id
            });

            var second_location = locations.filter(obj => {
                return obj.id === second_id
            });

            var view = {
                first_name: process.env.FIRST_NAME,
                second_name: process.env.SECOND_NAME,
                first_location: getAddress(first_location, process.env.FIRST_NAME),
                second_location: getAddress(second_location, process.env.SECOND_NAME),
            };

            // Join the locations to the return template
            var output = mustache.render(output_template, view);

            res.status(200).send(output);

        });

    });

    //
    // Get a map with the locations of our devices pinned on
    //
    app.get("/locationsmap", function (req, res) {

        var apple_id = process.env.APPLE_ID;
        var password = process.env.APPLE_PASSWORD;
        var first_id = process.env.FIRST_ID;
        var second_id = process.env.SECOND_ID;
        var isAtHome = require('../shared/functions.js').isAtHome;

        //console.log(iCloud)
        var cloud = new iCloud(apple_id, password);

        cloud.getLocations(function (err, result) {
            //console.log(err, result)

            var fs = require("fs");
            var output_template = fs.readFileSync("./routes/locationmap.html", 'utf8');

            var locations = result.locations;

            var first_location = locations.filter(obj => {
                return obj.id === first_id
            });

            var second_location = locations.filter(obj => {
                return obj.id === second_id
            });

            if (isAtHome(first_location, process.env.FIRST_NAME) && 
                isAtHome(second_location, process.env.SECOND_NAME)) {
                res.status(200).send("");
            } else {

                var view = {
                    lat1: first_location[0].location.latitude,
                    long1: first_location[0].location.longitude,
                    lat2: second_location[0].location.latitude,
                    long2: second_location[0].location.longitude,
                    apiKey: process.env.GOOGLE_MAPS_API_KEY,
                };

                // Join the locations to the return template
                var output = mustache.render(output_template, view);

                // Create an iframe as the MMM-REST table won't show it otherwise
                var iframe = "<iframe width='320' height='320' frameBorder='0'  allowtransparency='true' srcdoc=\"" + output + "\"></iframe>";

                res.status(200).send(iframe);
            }

        });

    });


    app.get("/packages", function (req, res) {

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

        var subject = req.body.subject ? req.body.subject : "No subject";
        var message = req.body.message ? req.body.message : "No message";

        numberPackages = numberPackages + 1;
        mostRecentPackage = Date.now();

        res.status(200).send("Subject: " + subject + "; Message: " + message + "; Last update: " + dateFormat(mostRecentPackage, "yyyy-mm-dd h:MM:ss"));

        // fetch(
        //     "http://dashboard.local:8080/AddMemo?memoTitle=Packages&item=" + subject + "&level=INFO",
        //     {
        //         method: "GET"
        // })
        // .then(function (data) {  

        //     fetch(
        //         "http://dashboard.local:8080/DisplayMemo?memoTitle=Packages&item=ALL",
        //         {
        //     })
        //     .then(function (data) {  
        //         console.log('Request success: ', data);
        //         res.status(200).send("Subject: " + subject + "; Message: " + message);
        //     })         
        // })  
        // .catch(function (error) {  
        //   console.log('Request failure: ', error);
        //   res.status(500).send("Error");
        // });

    });
}

module.exports = appRouter;