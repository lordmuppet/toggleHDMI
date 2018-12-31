var path = require("path");
var fetch = require('node-fetch');
var dateFormat = require('dateformat');
var iCloud = require('../shared/icloud.js');
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
        var first_name = process.env.FIRST_NAME;
        var second_name = process.env.SECOND_NAME;
        var first_id = process.env.FIRST_ID;
        var second_id = process.env.SECOND_ID;
        var string_to_return = "";
        var getAddress = require('../shared/functions.js').getAddress;

        console.log(iCloud)
        var cloud = new iCloud(apple_id, password);

        cloud.getLocations(function (err, result) {
            console.log(err, result)

            var locations = result.locations;

            var first_location = locations.filter(obj => {
                return obj.id === first_id
              });

            string_to_return = getAddress(first_location, first_name)
            
            var second_location = locations.filter(obj => {
                return obj.id === second_id
              });

            string_to_return = string_to_return + "<br>" + getAddress(second_location, second_name);
            
            res.status(200).send(string_to_return);

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