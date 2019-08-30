require('dotenv').config();
var fetch = require('node-fetch');
var FindMyFriends = require('./findmyfriends.js');
var NodeGeocoder = require('node-geocoder');
var fs = require("fs");

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

    // Get all the locations from all devices
    // needStreetAddress param used to check if needed
    // to do geoCoding for Xplora
    getLocations: async function(needStreetAddress){

        var apple_id = process.env.APPLE_ID;
        var password = process.env.APPLE_PASSWORD;

        var findMyFriends = new FindMyFriends();

        const userDevicesBin = fs.readFileSync("./devices.json");
        // Define to JSON type
        const userDevices = JSON.parse(userDevicesBin);

        const appleLocations = await findMyFriends.getLocations(apple_id, password); 
        
        // This will be the output template for mustache
        // We will fill in the locations array with data from apple and Xplora
        let outputView = {
            locations: [],
            allAtHome: false,
        }

        // Get apple locations
        const locations = appleLocations.map( async (location, index) => {
            const user = userDevices.filter( device => device.id === location.id);
            if (user.length >0){
                return {
                    index: index,
                    name: user[0].name,
                    id: location.id,
                    lat: location.location.latitude,
                    long: location.location.longitude,
                    location: needStreetAddress ? await module.exports.getAddress(location.location, user[0]) : null,
                    icon: user[0].icon,
                    radiusKm: user[0].radiusKm,
                }
            }
        });

        outputView.locations = await Promise.all(locations);

        // Get xplora watch locations
        const xploraLocations = await module.exports.getXploraLocation(userDevices);
        const moreLocations = xploraLocations.map( async (location, index) => {
            const user = userDevices.filter( device => device.id === location.result.deviceId);
            if (user.length > 0){
                return{
                    index: index + outputView.locations.length,
                    name: user[0].name,
                    id: user[0].id,
                    lat: location.result.data.coordinate.latitude,
                    long: location.result.data.coordinate.longitude,
                    location: needStreetAddress ? await module.exports.getAddress(location.result.data.coordinate, user[0]) : null,
                    icon: user[0].icon,
                    radiusKm: user[0].radiusKm,
                }
            }
        })

        // Concat the apple and xplora locations together...
        outputView.locations = outputView.locations.concat(await Promise.all(moreLocations));

        // check if all the locations are at home
        outputView.allAtHome = outputView.locations.every( module.exports.isAtHome )

        return outputView;

    },
    // Get the Xplora watch location
    getXploraLocation: async function (devices) {

        const xploraUsers = devices.filter( device => device.type ==='xplora');

        // If there are no xplora device return nothing
        if (xploraUsers.length === 0){
            return [];
        }

        const headers = {
            "Host": "xplorano.kidslink.co.kr",
            "X-Parse-Client-Version": "i1.13.0",
            "Accept": "*/*",
            "X-Parse-Session-Token": process.env.XPLORA_SESSION_TOKEN,
            "X-Parse-Application-Id": "KIDZON",
            "X-Parse-Installation-Id": "d9908ce9-d287-4fee-93a6-cd7a0d48a94d",
            "X-Parse-OS-Version": "12.3.1 (16F203)",
            "Accept-Language": "en-us",
            "Accept-Encoding": "br, gzip, deflate",
            "Content-Type": "application/json; charset=utf-8",
            "User-Agent": "JoonBox/2210 CFNetwork/978.0.7 Darwin/18.6.0",
            "Connection": "keep-alive",
            "X-Parse-App-Build-Version": "2210",
            "X-Parse-App-Display-Version": "2.2.10",
        }

        const locationPromises = xploraUsers.map( async(users) => {

            const body = {
                "command":"getLast",
                "deviceId": users.id,
            }

            // Fetch the location data
            const location = process.env.XPLORA_LOCATION_URL;
            const settings = {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(body)
            };
            try {
                const fetchResponse = await fetch(location, settings);
                const data = await fetchResponse.json();
                return data;
            } catch (e) {
                console.log(e)
                return e;
            } 

        })
        return Promise.all(locationPromises);

    },
    // Get the address of the icon of the POI. Uses the 'user/device' settings
    // provided in devices.json
    getAddress: async function (location, user) {

        if ( !location || location.length === 0 ) {
            return "";
        }

        var lat = location.latitude;
        var long = location.longitude;

        // Get Points of interest from file
        var contents = fs.readFileSync("./shared/pois.json");
        // Define to JSON type
        var pois = JSON.parse(contents);

        // Check each poi against the provided user's location
        for (let poi of pois ){
           
            if (arePointsNear(lat, long, poi.latitude, poi.longitude, user.radiusKm) ) {
                console.log("For "+ user.name + " Using poi: " + poi.name);
                return poi.display;
            }

        };

        // Handle user device types differently. Apple provides street details
        switch (user.type){
            
            case 'apple':
                return location.address.streetAddress + ", " + location.address.locality;
        
            case 'xplora':
                const address =  await module.exports.decodeCoordinatesToAddress(lat, long);
                return address
                    .replace('East', 'E')
                    .replace('West', 'W')
                    .replace('Street', 'St')
                    .replace('Avenue', 'Ave');
            default:
                
        }
    },
    // Get street address from long lat using Google maps decode
    decodeCoordinatesToAddress: async function (lat, lon){

        const options = {
            provider: 'google',
            httpAdapter: 'https', // Default
            apiKey: process.env.GOOGLE_MAPS_API_KEY, 
            formatter: null         // 'gpx', 'string', ...
          };

        // Transform coordinates to address
        var geocoder = NodeGeocoder(options);
        const res = await geocoder.reverse({ lat: lat, lon: lon })
        
        return res[0].streetNumber + ' ' + res[0].streetName + ', ' + res[0].city;
    },
    isAtHome: function (location) {

        if ( !location ) {
            return false;
        }

        var lat = location.lat;
        var long = location.long;

        // Get Points of interest from file
        var contents = fs.readFileSync("./shared/pois.json");
        // Define to JSON type
        var pois = JSON.parse(contents);

        // Check each poi against the provided user's location, and return true if at home
        for (let poi of pois ){
            if (poi.name === "Home" && arePointsNear(lat, long, poi.latitude, poi.longitude, location.radiusKm) ) {
                return true;
            }
        }
        
        return false;

    },
    subtract: function (num1, num2) {
        return subtract(num1, num2);
    }
};
