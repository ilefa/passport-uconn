import _ from 'underscore';

import url from 'url';
import http from 'http';
import https from 'https';
import passport from 'passport';
import processors from 'xml2js/lib/processors';

import { parseString } from 'xml2js';

export type StrategyOptions = {
    serverBaseURL: string;
    serviceURL: string;
    passReqToCallback: boolean;
}

function Strategy(options: StrategyOptions, verify) {
    if (!verify) throw new Error('Missing verify function');

    this.ssoBase = 'https://login.uconn.edu/cas';
    this.serverBaseURL = options.serverBaseURL;
    this.serviceURL = options.serviceURL;
    this.parsed = url.parse(this.ssoBase);
    this.client = this.parsed.protocol === 'http:' ? http : https;

    passport.Strategy.call(this);

    this.name = 'cas';
    this._verify = verify;
    this._passReqToCallback = options.passReqToCallback;

    let xmlParseOpts = {
        'trim': true,
        'normalize': true,
        'explicitArray': false,
        'tagNameProcessors': [processors.normalize, processors.stripPrefix]
    };

    let self = this;

    this._validateUri = "/serviceValidate";
    this._validate = function (req, body, verified) {
        parseString(body, xmlParseOpts, function (err, result) {
            if (err) return verified(new Error('Invalid response'));
            
            try {
                if (result.serviceresponse.authenticationfailure)
                    return verified(new Error('Authentication failed ' + result.serviceresponse.authenticationfailure.$.code));

                let success = result.serviceresponse.authenticationsuccess;
                if (success) {
                    if (self._passReqToCallback) {
                        self._verify(req, success, verified);
                        return;
                    }
                    
                    self._verify(success, verified);
                    return;
                }

                return verified(new Error('Authentication failed'));
            } catch (e) {
                return verified(new Error('Authentication failed: ' + e.message));
            }
        });
    };
}

Strategy.prototype.service = function(req) {
    let serviceURL = this.serviceURL || req.originalUrl;
    let resolvedURL = url.resolve(this.serverBaseURL, serviceURL);
    let parsedURL = url.parse(resolvedURL, true);

    delete parsedURL.query.ticket;
    delete parsedURL.search;
    
    return url.format(parsedURL);
};

Strategy.prototype.authenticate = function (req, options) {
    options = options || {};

    let relayState = req.query.RelayState;
    if (relayState) {
        req.logout();
        return this.redirect(this.ssoBase + '/logout?_eventId=next&RelayState=' + relayState);
    }

    let service = this.service(req);
    let ticket = req.query
        ? req.query['ticket']
        : null;

    if (!ticket) {
        let redirectURL = url.parse(this.ssoBase + '/login', true);
        redirectURL.query.service = service;
        for (let property in options.loginParams ) {
            let loginParam = options.loginParams[property];
            if (loginParam) redirectURL.query[property] = loginParam;
        }
        
        return this.redirect(url.format(redirectURL));
    }

    let self = this;
    let verified = (err, user, info) => {
        if (err) return self.error(err);
        if (!user) return self.fail(info);
        self.success(user, info);
    };

    let _validateUri = this.validateURL || this._validateUri;
    let _handleResponse = response => {
        let body = '';
        response.setEncoding('utf8');
        response.on('data', chunk => body += chunk);
        return response.on('end', () => self._validate(req, body, verified));
    };

    let get = this.client.get({
        host: this.parsed.hostname,
        port: this.parsed.port,
        path: url.format({
            pathname: this.parsed.pathname + _validateUri,
            query: {
                ticket: ticket,
                service: service
            }
        })
    }, _handleResponse);

    get.on('error', e => self.fail(new Error(e)));
};

export { Strategy };