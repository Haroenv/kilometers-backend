'use strict';
const config = require('./config.json');
const mailgun = require('mailgun-js')({apiKey: config.key, domain: config.domain});
const Firebase = require('firebase');
const base = new Firebase(config.firebase.url);
