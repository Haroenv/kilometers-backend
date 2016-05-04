'use strict';

var config = require('./config.json');
var mailgun = require('mailgun-js')({
  apiKey: config.mailgun.key,
  domain: config.mailgun.domain
});
var path = require('path');
var fs = require('fs');
var Firebase = require('firebase');
var base = new Firebase(config.firebase.url);

var sendEmail = function sendEmail(to, requestKey, attachmentName) {
  var emailTemp = '\n<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="utf-8">\n</head>\n<body style="font-family: -apple-system, Roboto, sans-serif;">\n  <p>Hey!</p>\n  <div style="margin: 2em 0;">\n    <p>You requested your time schedule to be sent to this email address</p>\n    <p>In attachment you find your schedule in <code>csv</code> format.</p>\n  </div>\n  <p>Yours truly,</p>\n  <p>Kilometers</p>\n  <p>Haroen Viaene</p>\n  <p><a href="https://twitter.com/haroenv">@haroenv</a></p>\n</body>\n</html>';
  var textTemp = '\nHey!\n\nYou requested your time schedule to be sent to this email address\nIn attachment you find your schedule in csv format.\n\nYours truly,\nKilometers\nHaroen Viaene';
  mailgun.messages().send({
    from: 'Kilometers <' + config.mailgun.from + '@' + config.mailgun.domain + '>',
    to: to,
    subject: 'Your report is ready!',
    html: emailTemp,
    text: textTemp,
    attachment: path.join(__dirname, attachmentName)
  }, function (error, body) {
    if (!error) {
      console.log(body);
      base.child('emails').child(requestKey).child('sent').set(true);
    } else {
      console.warn("email error", 'Kilometers <' + config.mailgun.from + '@' + config.mailgun.domain + '>');
      console.warn(error);
    }
  });
};

var months = ['jan', 'feb', 'maa', 'apr', 'mei', 'jun', 'jul', 'aug', 'sept', 'okt', 'nov', 'dec'];
var header = '"Datum", "Afgelegd traject",  "Vertrek", "Aankomst", "Afstand in km", "Reden"\n';

base.authWithCustomToken(config.firebase.secret, function (error, authData) {
  if (!error) {
    base.child('emails').on('child_added', function (snap) {
      if (snap.val().sent === false || snap.val().sent === 'false') {
        (function () {
          fs.writeFile('./report' + snap.key() + '.csv', header, function (err) {
            if (err) console.warn(err);
          });
          var lines = 0;
          var total = void 0;
          base.child('users').child(snap.val().user).child('days').once('value').then(function (temp) {
            total = temp.numChildren();
          }).then(function () {
            base.child('users').child(snap.val().user).child('days').on('child_added', function (s) {
              base.child('days').child(s.key()).on('value', function (sn) {
                var date = new Date(sn.val().day);
                var places = [],
                    start = new Date(),
                    arrival = new Date(),
                    index = 0,
                    distance = 0,
                    reason = sn.val().reason;
                for (var i in sn.val().places) {
                  if (index === 0) {
                    start = new Date(sn.val().places[i].time);
                  } else if (index === Object.keys(sn.val().places).length - 1) {
                    arrival = new Date(sn.val().places[i].time);
                  }
                  places.push(sn.val().places[i].location);
                  distance += sn.val().places[i].distance;
                  index++;
                }
                var line = '"' + date.getDate() + ' ' + months[date.getMonth()] + '","' + places.join(' — ') + '","' + start.getHours() + ':' + start.getMinutes() + '","' + arrival.getHours() + ':' + arrival.getMinutes() + '","' + distance + 'km","' + reason + '"\n';
                fs.appendFile('./report' + snap.key() + '.csv', line, function (err) {
                  if (err) console.warn(err);
                  lines++;
                  if (lines === total) {
                    sendEmail(snap.val().email, snap.key(), 'report' + snap.key() + '.csv');
                  }
                });
              });
            });
          });
        })();
      }
    });
  }
});
