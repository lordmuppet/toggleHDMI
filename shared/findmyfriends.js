var bluebird = require('bluebird');
var r = bluebird.promisify(require('request').defaults({jar: true}));
var uuid = require('node-uuid');

module.exports = class FindMyFriends {
    constructor() {
        this.pid = "18AProject103";
        this.fcbn = "18AHotfix13";
        this.cid = uuid().toUpperCase();
        this.cmn = "18A91";
        this.dsid = "610001744";
        this.userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.132 Safari/537.36"
        this.webservices = [];
        this.fmfPayload = {};
    }

    async getLocations(email, password) {
            if (email && password) {
                var validate = await this.validate();
                await this.signin(validate.loginidmsa, validate.widgetKey, email, password);
                await this.accountLogin(validate.accountLogin, validate.widgetKey);
                await this.initFmf();
                return await this.getAllLocations();
            }
    }

    validate() {
        var validate = {
            method: 'POST',
            uri: `https://setup.icloud.com/setup/ws/1/validate?clientBuildNumber=${this.pid}&clientId=${this.cid}&clientMasteringNumber=${this.cmn}`,
            headers: {
                'Connection': 'keep-alive',
                'Origin': 'https://www.icloud.com',
                'Referer': 'https://www.icloud.com',
                'User-Agent': this.userAgent
            },
            json: true
        }

        return new Promise(resolve => {
            r(validate).then(res => {
                var obj = {
                    login: res.body["configBag"]["urls"]["accountLogin"],
                    widgetKey: res.body["configBag"]["urls"]["accountLoginUI"].split("=")[1],
                    loginidmsa: res.body["configBag"]["urls"]["accountLoginUI"],
                    accountLogin: res.body["configBag"]["urls"]["accountLogin"],
                }
                resolve(obj);
            })
        });
    }

    signin(uri, widgetKey, email, password) {
        var signin = {
            method: 'POST',
            uri: `${uri}`,//?clientBuildNumber=${this.pid}&clientId=${this.cid}&clientMasteringNumber=${this.cmn}`,
            headers: {
                // 'Connection': 'keep-alive',
                "Accept": "application/json, text/javascript",
                "Content-Type": "application/json",
                'Origin': 'https://idmsa.apple.com',
                'Referer': 'https://idmsa.apple.com',
                'User-Agent': this.userAgent,
                "X-Apple-Widget-Key": widgetKey,
                "X-Requested-With": "XMLHttpRequest",
            },
            body: {
                accountName: email,
                // apple_id: email,
                password: password,
                rememberMe: false,
                // trustTokens: {}
            },
            json: true
        }

        return new Promise(resolve => {
            r(signin).then(res => {
                

                if (!res.body.hasOwnProperty("error")) {
                    this.webservices = res.body["webservices"];
                    this.sessionToken = res.headers["x-apple-session-token"]
                    resolve(res.body);
                } else {
                    reject("Login failed. Incorrect email/password?");
                }
            })
        });
    }

    accountLogin(uri, widgetKey) {
        var signin = {
            method: 'POST',
            uri: `${uri}?clientBuildNumber=${this.pid}&clientId=${this.cid}&clientMasteringNumber=${this.cmn}`,
            headers: {
                // 'Connection': 'keep-alive',
                "Accept": "application/json, text/javascript",
                "Content-Type": "application/json",
                'Origin': 'https://www.icloud.com',
                'Referer': 'https://www.icloud.com',
                'User-Agent': this.userAgent,
                // "X-Apple-Widget-Key": widgetKey,
                // "X-Requested-With": "XMLHttpRequest",
            },
            body: {
                "dsWebAuthToken": this.sessionToken,
                "extended_login": false,
                },
            json: true
        }

        return new Promise(resolve => {
            r(signin).then(res => {
                

                if (!res.body.hasOwnProperty("error")) {
                    this.webservices = res.body["webservices"];
                    this.dsid = res.body["dsInfo"]["dsid"]
                    resolve(res.body);
                } else {
                    reject("Login failed. Incorrect email/password?");
                }
            })
        });
    }

    initFmf() {
        var init = {
            method: 'POST',
            uri: `${this.webservices["fmf"]["url"].split(":443")[0]}/fmipservice/client/fmfWeb/initClient?clientBuildNumber=${this.fcbn}&clientMasteringNumber=${this.fcbn}&clientId=${this.cid}&dsid=${this.dsid}`,
            headers: {
                'Connection': 'keep-alive',
                'Origin': 'https://www.icloud.com',
                'Referer': 'https://www.icloud.com/applications/fmf/current/en-us/index.html?',
                'User-Agent': this.userAgent
            },
            json: true
        }

        return new Promise(resolve => {
            r(init).then(res => {
                this.fmfPayload = {
                    clientContext: {
                        appVersion: '1.0',
                        contextApp: 'com.icloud.web.fmf',
                        mapkitAvailable: true,
                        productType: 'fmfWeb',
                        tileServer: 'Apple',
                        userInactivityTimeInMS: 129773,
                        windowInFocus: false,
                        windowVisible: true
                    },
                    dataContext: res.body["dataContext"],
                    serverContext: res.body["serverContext"]
                }
                resolve();
            });
        });
    }

    getAllLocations() {
        var refresh = {
            method: 'POST',
            uri: `${this.webservices["fmf"]["url"].split(":443")[0]}/fmipservice/client/fmfWeb/refreshClient?clientBuildNumber=${this.fcbn}&clientMasteringNumber=${this.fcbn}&clientId=${this.cid}&dsid=${this.dsid}`,
            headers: {
                'Connection': 'keep-alive',
                'Origin': 'https://www.icloud.com',
                'Referer': 'https://www.icloud.com/applications/fmf/current/en-us/index.html?',
                'User-Agent': this.userAgent,
                'Cache-Control': 'no-cache'
            },
            body: {
                clientContext: this.fmfPayload["clientContext"],
                dataContext: this.fmfPayload["dataContext"],
                serverContext: this.fmfPayload["serverContext"]
            },
            json: true
        }

        return new Promise(resolve => {
            r(refresh).then(res => {
                this.fmfPayload["dataContext"] = res.body["dataContext"];
                this.fmfPayload["serverContext"] = res.body["serverContext"];
                resolve(res.body["locations"])
            });
        });
    }

    async getLocationById(id) {
        var allLocations = await this.getAllLocations();
        return new Promise(resolve => {
            for (var loc in allLocations) {
                if (allLocations[loc]['id'] == id) {
                    console.log(allLocations[loc]);
                    resolve(allLocations[loc]);
                }
            }
            resolve(undefined);
        });
    }
    
}