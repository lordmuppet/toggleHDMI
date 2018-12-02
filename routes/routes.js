var path    = require("path");

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

    app.get("/newpackage", function(req, res) {
        res.status(200).send("New Package!");
    });
}

module.exports = appRouter;