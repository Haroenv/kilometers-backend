'use strict';
const config = require('./config.json');
const mailgun = require('mailgun-js')({
  apiKey: config.key,
  domain: config.domain
});
const path = require('path');
const Firebase = require('firebase');
const base = new Firebase(config.firebase.url);

base.authWithCustomToken(config.firebase.secret, function(error, authData) {
  if (!error) {
    base.child('emails').on('child_added', snap => {
      if (snap.val().sent === false || snap.val().sent === 'false') {
        let emailTemp = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="font-family: -apple-system, Roboto, sans-serif;">
  <p>Hey!</p>
  <div style="margin: 2em 0;">
    <p>You requested your time schedule to be sent to this email address</p>
    <p>In attachment you find your schedule in <code>csv</code> format.</p>
  </div>
  <p>Yours truly,</p>
  <p>Kilometers</p>
  <p>Haroen Viaene</p>
  <p><a href="https://twitter.com/haroenv">@haroenv</a></p>
</body>
</html>`;
        let textTemp = `
Hey!

You requested your time schedule to be sent to this email address
In attachment you find your schedule in csv format.

Yours truly,
Kilometers
Haroen Viaene`;
        mailgun.messages().send({
          from: 'Kilometers <' + config.from + '@' + config.domain + '>',
          to: snap.val().email,
          subject: 'Your report is ready!',
          html: emailTemp,
          text: textTemp,
          attachment: path.join(__dirname, 'package.json')
        }, function(error, body) {
          if (!error) {
            console.log(body);
            base.child('emails')
              .child(snap.key())
              .child('sent')
              .set(true);
          }
        });
      }
    });
  }
});
