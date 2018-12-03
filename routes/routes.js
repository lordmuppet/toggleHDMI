var path    = require("path");
var fetch = require('node-fetch');
var dateFormat = require('dateformat');

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

    app.get("/map", function(req, res) {
        res.sendFile(path.join(__dirname+'/map.html'));
    });

    app.get("/packages", function(req, res) {

        // Reset the package count when we go past midnight
        if(dateFormat(currentDay, "dd") !== dateFormat(Date.now(), "dd")){
            currentDay = Date.now();
            numberPackages = 0;
            mostRecentPackage = null;
            
            // Return nothing
            res.status(200).send("Updated the current date");
            return 
        }

        if (numberPackages > 0){
            // var string_to_return = numberPackages === 1 ? numberPackages + " package delivered today" :
            //     numberPackages + " packages delivered today";
            
            var string_to_return="";
                
            for (i=0; i<numberPackages; i++){
                string_to_return = string_to_return + "<i class='fa fa-gift fa-3x'></i>";
            }
            res.status(200).send(string_to_return);
        } else {
            res.status(200).send("");
        }
        
    });

    app.post("/newpackage", function(req, res) {

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