require('dotenv').config();

function arePointsNear(checkLat, checkLong, centerLat, centerLong, km) {
    var ky = 40000 / 360;
    var kx = Math.cos(Math.PI * centerLat / 180.0) * ky;
    var dx = Math.abs(centerLong - checkLong) * kx;
    var dy = Math.abs(centerLat - checkLat) * ky;
    return Math.sqrt(dx * dx + dy * dy) <= km;
};

module.exports = {
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
    subtract: function (num1, num2) {
        return subtract(num1, num2);
    }
};
