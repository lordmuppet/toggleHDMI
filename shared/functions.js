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

        if (req.query.q && req.query.q === process.env.SECRET) {
            return true;
        } else {
            return false;
        }
    },

    // Get all the locations from all devices
    // needStreetAddress param used to check if needed
    // to do geoCoding for Xplora
    getLocations: async function (needStreetAddress) {

        const userDevicesBin = fs.readFileSync("./devices.json");
        // Define to JSON type
        const userDevices = JSON.parse(userDevicesBin);

        // This will be the output template for mustache
        // We will fill in the locations array with data from apple and Xplora
        let outputView = {
            locations: [],
            allAtHome: false,
        }

        // // Get apple locations

        // var apple_id = process.env.APPLE_ID;
        // var password = process.env.APPLE_PASSWORD;
        // var findMyFriends = new FindMyFriends();
        // const appleLocations = await findMyFriends.getLocations(apple_id, password);
        // const locations = appleLocations.map(async (location, index) => {
        //     const user = userDevices.filter(device => device.id === location.id);
        //     if (user.length > 0) {
        //         return {
        //             index: index,
        //             name: user[0].name,
        //             id: location.id,
        //             lat: location.location.latitude,
        //             long: location.location.longitude,
        //             location: needStreetAddress ? 
        //                 await module.exports.getAddress(location.location.latitude, 
        //                     location.location.longitude, 
        //                     location.location.address.streetAddress + ", " + location.location.address.locality,
        //                     user[0]) 
        //                 : null,
        //             icon: user[0].icon,
        //             radiusKm: user[0].radiusKm,
        //         }
        //     }
        // });

        // Get Home Assistant locations
        outputView.locations = await module.exports.getHassioLocations(userDevices, needStreetAddress);

        // outputView.locations = await Promise.all(locations);

        // // Get xplora watch locations
        // const xploraLocations = await module.exports.getXploraLocation(userDevices);
        // const moreLocations = xploraLocations.map(async (location, index) => {
        //     const user = userDevices.filter(device => device.id === location.result.deviceId);
        //     if (user.length > 0) {
        //         return {
        //             index: index + outputView.locations.length,
        //             name: user[0].name,
        //             id: user[0].id,
        //             lat: location.result.data.coordinate.latitude,
        //             long: location.result.data.coordinate.longitude,
        //             location: needStreetAddress ? await module.exports.getAddress(location.result.data.coordinate, user[0]) : null,
        //             icon: user[0].icon,
        //             radiusKm: user[0].radiusKm,
        //         }
        //     }
        // })

        // const ojoyLocations = await module.exports.getOjoyLocation(userDevices);
        // const moreLocations = ojoyLocations.map(async (location, index) => {
        //     const user = userDevices.filter(device => device.id === location.d.Data.ChildId.toString());
        //     const lat = parseFloat(new Buffer(location.d.Data.Lat, 'base64').toString('ascii'));
        //     const long = parseFloat(new Buffer(location.d.Data.Lng, 'base64').toString('ascii'))

        //     if (user.length > 0) {
        //         return {
        //             index: index + outputView.locations.length,
        //             name: user[0].name,
        //             id: user[0].id,
        //             lat: lat,
        //             long: long,
        //             location: needStreetAddress ?
        //                 await module.exports.getAddress(
        //                     lat,
        //                     long,
        //                     null,
        //                     user[0])
        //                 : null,
        //             icon: user[0].icon,
        //             radiusKm: user[0].radiusKm,
        //         }
        //     }
        // })

        // // Concat the apple and xplora locations together...
        // outputView.locations = outputView.locations.concat(await Promise.all(moreLocations));

        // check if all the locations are at home
        outputView.allAtHome = outputView.locations.every(module.exports.isAtHome)

        return outputView;

    },
    // Get the OJoy watch location
    getOjoyLocation: async function (devices) {

        const ojoyUsers = devices.filter(device => device.type === 'ojoy');

        // If there are no ojoy device return nothing
        if (ojoyUsers.length === 0) {
            return [];
        }

        const headers = {
            "Content-Type": "application/json",
            "User-Agent": "Ojoy watch/1.7 (iPhone; iOS 12.3.1; Scale/2.00)",
        }

        const locationPromises = ojoyUsers.map(async (users) => {

            const body = {
                "childId": users.id,
                "userId": process.env.OJOY_USER_ID,
                "SessionKey": process.env.OJOY_SESSION_TOKEN
            }

            // Fetch the location data
            const location = process.env.OJOY_LOCATION_URL;
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
    // Get the Xplora watch location
    getXploraLocation: async function (devices) {

        const xploraUsers = devices.filter(device => device.type === 'xplora');

        // If there are no xplora device return nothing
        if (xploraUsers.length === 0) {
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

        const locationPromises = xploraUsers.map(async (users) => {

            const body = {
                "command": "getLast",
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
    // Get the Home Assistant location
    getHassioLocations: async function (devices, needStreetAddress) {

        const hassioUsers = devices.filter(device => device.type === 'hassio');

        // If there are no hassioUsers return nothing
        if (hassioUsers.length === 0) {
            return [];
        }

        const headers = {
            "Authorization": `Bearer ${process.env.HASSIO_TOKEN}`,
        }

        // Fetch the location data
        const baseUrl = process.env.HASSIO_URL;
        const settings = {
            method: 'GET',
            headers: headers,
        };
        try {

            const locations = [];

            for (const [index, hassioUser] of hassioUsers.entries()) {

                // Get the response from Home Assistant
                const fetchResponse = await fetch(`${baseUrl}${hassioUser.id}`, settings);

                if (fetchResponse.status === 200) {

                    const matchingState = await fetchResponse.json();

                    if (matchingState && matchingState.attributes.latitude) {

                        locations.push({
                            index: index,
                            name: hassioUser.name,
                            id: matchingState.entity_id,
                            lat: matchingState.attributes.latitude,
                            long: matchingState.attributes.longitude,
                            location: needStreetAddress ?
                                await module.exports.getAddress(matchingState.attributes.latitude,
                                    matchingState.attributes.longitude,
                                    null,
                                    hassioUser)
                                : null,
                            icon: hassioUser.icon,
                            radiusKm: hassioUser.radiusKm,
                        })
                    }


                }

            }

            return locations;
        } catch (e) {
            console.log(e)
            return e;
        }


    },
    // Get the address of the icon of the POI. Uses the 'user/device' settings
    // provided in devices.json
    getAddress: async function (lat, long, streetAddress, user) {

        if (!lat || !long) {
            return "";
        }

        // Get Points of interest from file
        var contents = fs.readFileSync("./shared/pois.json");
        // Define to JSON type
        var pois = JSON.parse(contents);

        // Check each poi against the provided user's location
        for (let poi of pois) {

            if (arePointsNear(lat, long, poi.latitude, poi.longitude, user.radiusKm)) {
                console.log("For " + user.name + " Using poi: " + poi.name);
                return poi.display;
            }

        };

        // If the streetAddress is provided then use otherwise
        // get coordinates from Google
        if (streetAddress) {
            return streetAddress;
        } else {
            const address = await module.exports.decodeCoordinatesToAddress(lat, long);
            return address
                .replace('East', 'E')
                .replace('West', 'W')
                .replace('Street', 'St')
                .replace('Avenue', 'Ave');
        }
    },
    // Get street address from long lat using Google maps decode
    decodeCoordinatesToAddress: async function (lat, lon) {

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

        if (!location) {
            return false;
        }

        var lat = location.lat;
        var long = location.long;

        // Get Points of interest from file
        var contents = fs.readFileSync("./shared/pois.json");
        // Define to JSON type
        var pois = JSON.parse(contents);

        // Check each poi against the provided user's location, and return true if at home
        for (let poi of pois) {
            if (poi.name === "Home" && arePointsNear(lat, long, poi.latitude, poi.longitude, location.radiusKm)) {
                return true;
            }
        }

        return false;

    },
    subtract: function (num1, num2) {
        return subtract(num1, num2);
    },
    // Get AQI from api.waqi.info
    getAqi: async function () {


        const params = {
            token: process.env.WAQI_TOKEN
        }
        // Fetch the aqi data
        const Url = `${process.env.WAQI_URL}?token=${process.env.WAQI_TOKEN}`;
        const settings = {
            method: 'GET',
        };

        console.log(settings, Url);
        try {

            const fetchResponse = await fetch(`${Url}`, settings);

            if (fetchResponse.status === 200) {

                const aqi_output = await fetchResponse.json();
                console.log(aqi_output);
                return aqi_output.data.aqi;

            }

            
        } catch (e) {
            console.log(e)
            return e;
        }


    }
};
