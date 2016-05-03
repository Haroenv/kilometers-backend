'use strict';
const config = require('./config.json');
const mailgun = require('mailgun-js')({
  apiKey: config.mailgun.key,
  domain: config.mailgun.domain
});
const path = require('path');
const Firebase = require('firebase');
const base = new Firebase(config.firebase.url);

const sendEmail = function() {
  const emailTemp = `
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
  const textTemp = `
Hey!

You requested your time schedule to be sent to this email address
In attachment you find your schedule in csv format.

Yours truly,
Kilometers
Haroen Viaene`;
  mailgun.messages().send({
    from: 'Kilometers <' + config.mailgun.from + '@' + config.domain + '>',
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

const months = ['jan','feb','maa','apr','mei','jun','jul','aug','sept','okt','nov','dec'];

base.authWithCustomToken(config.firebase.secret, function(error, authData) {
  if (!error) {
    base.child('emails').on('child_added', snap => {
      if (snap.val().sent === false || snap.val().sent === 'false') {
        console.log('"Datum", "Afgelegd traject",  "Vertrek", "Aankomst", "Afstand in km", "Reden"');
        base.child('users').child(snap.val().user).child('days').on('child_added', s => {
          base.child('days').child(s.key()).on('value', sn => {
            // console.log(sn.val());
            const date = new Date(sn.val().day);
            for (let i in sn.val().places) {
              let place = sn.val().places[i];
              console.log(`https://maps.googleapis.com/maps/api/distancematrix/json?origins=${place.latitude},${place.longitude}&destinations=${place.latitude},${place.longitude}&key=${config.googlemaps.key}&mode=${"driving"}&departure_time=${place.time}`);
            }
            let places = 'Brugge - Gent';
            let start = '07:00';
            let arrival = '18:00';
            let url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${0}&destinations=${0}&key=${config.googlemaps.key}&mode=${"driving"}&departure_time=${0}`;
            console.log(url);
            let distance = '5km';
            console.log(`"${date.getDate()} ${months[date.getMonth()]}","${places}","${start}","${arrival}","${distance}"`);
          });
        });
        // sendEmail();
      }
    });
  }
});
