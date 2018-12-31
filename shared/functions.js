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

        if (arePointsNear(lat, long, parseFloat(process.env.HOME_LAT), parseFloat(process.env.HOME_LONG), 0.3) ) {
            return name + ": <i class='fa fa-home'></i>";
        }

        return name + ": " + location[0].location.address.streetAddress + ", " + location[0].location.address.locality;

    },
    subtract: function (num1, num2) {
        return subtract(num1, num2);
    }
};
