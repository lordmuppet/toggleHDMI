require('dotenv').config();

function arePointsNear(checkLat, checkLong, centerLat, centerLong, km) {
    var ky = 40000 / 360;
    var kx = Math.cos(Math.PI * centerLat / 180.0) * ky;
    var dx = Math.abs(centerLong - checkLong) * kx;
    var dy = Math.abs(centerLat - checkLat) * ky;
    return Math.sqrt(dx * dx + dy * dy) <= km;
};

module.exports = {
    isSecretValid: function (req) {

        if (req.query.q && req.query.q === process.env.SECRET){
            return true;
        } else {
            return false;
        }
    },
    getAddress: function (location, name) {

        if ( !location || location.length === 0 ) {
            return "";
        }

        var lat = location[0].location.latitude;
        var long = location[0].location.longitude;
        var fs = require("fs");

        // Get Points of interest from file
        var contents = fs.readFileSync("./shared/pois.json");
        // Define to JSON type
        var pois = JSON.parse(contents);

        // Check each poi against the provided user's location
        for (let poi of pois ){
           
            if (arePointsNear(lat, long, poi.latitude, poi.longitude, parseFloat(process.env.RADIUS_KM)) ) {
                console.log("For "+ name + " Using poi: " + poi.name);
                return poi.display;
            }

        };
        
        return location[0].location.address.streetAddress + ", " + location[0].location.address.locality;

    },
    isAtHome: function (location, name) {

        if ( !location || location.length === 0 ) {
            return false;
        }

        var lat = location[0].location.latitude;
        var long = location[0].location.longitude;
        var fs = require("fs");

        // Get Points of interest from file
        var contents = fs.readFileSync("./shared/pois.json");
        // Define to JSON type
        var pois = JSON.parse(contents);

        // Check each poi against the provided user's location, and return true if at home
        for (let poi of pois ){

            if (poi.name === "Home" && arePointsNear(lat, long, poi.latitude, poi.longitude, parseFloat(process.env.RADIUS_KM)) ) {
                console.log(name + " is at home");
                return true;
            }

        };
        
        return false;

    },
    subtract: function (num1, num2) {
        return subtract(num1, num2);
    }
};
