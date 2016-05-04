'use strict';
const config = require('./config.json');
const mailgun = require('mailgun-js')({
  apiKey: config.mailgun.key,
  domain: config.mailgun.domain
});
const path = require('path');
const fs = require('fs');
const Firebase = require('firebase');
const base = new Firebase(config.firebase.url);

const sendEmail = function(to, requestKey, attachmentName) {
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
    from: `Kilometers <${config.mailgun.from}@${config.mailgun.domain}>`,
    to: to,
    subject: 'Your report is ready!',
    html: emailTemp,
    text: textTemp,
    attachment: path.join(__dirname, attachmentName)
  }, function(error, body) {
    if (!error) {
      console.log(body);
      base.child('emails')
        .child(requestKey)
        .child('sent')
        .set(true);
    } else {
      console.warn("email error", `Kilometers <${config.mailgun.from}@${config.mailgun.domain}>`);
      console.warn(error);
    }
  });
};

const months = ['jan', 'feb', 'maa', 'apr', 'mei', 'jun', 'jul', 'aug', 'sept', 'okt', 'nov', 'dec'];
const header = '"Datum", "Afgelegd traject",  "Vertrek", "Aankomst", "Afstand in km", "Reden"\n';

base.authWithCustomToken(config.firebase.secret, function(error, authData) {
  if (!error) {
    base.child('emails').on('child_added', (snap) => {
      if (snap.val().sent === false || snap.val().sent === 'false') {
        fs.writeFile(`./report${snap.key()}.csv`, header, (err) => {
          if (err) console.warn(err)
        });
        let lines = 0;
        let total;
        base.child('users').child(snap.val().user).child('days').once('value')
          .then(temp => {
            total = temp.numChildren();
          })
          .then(() => {
            base.child('users').child(snap.val().user).child('days').on('child_added', s => {
              base.child('days').child(s.key()).on('value', (sn) => {
                const date = new Date(sn.val().day);
                let places = [],
                  start = new Date(),
                  arrival = new Date(),
                  index = 0,
                  distance = 0,
                  reason = sn.val().reason;
                for (let i in sn.val().places) {
                  if (index === 0) {
                    start = new Date(sn.val().places[i].time);
                  } else if (index === Object.keys(sn.val().places).length - 1) {
                    arrival = new Date(sn.val().places[i].time);
                  }
                  places.push(sn.val().places[i].location);
                  distance += sn.val().places[i].distance;
                  index++;
                }
                let line = `"${date.getDate()} ${months[date.getMonth()]}","${places.join(' — ')}","${start.getHours()}:${start.getMinutes()}","${arrival.getHours()}:${arrival.getMinutes()}","${distance}km","${reason}"\n`;
                fs.appendFile(`./report${snap.key()}.csv`, line, (err) => {
                  if (err) console.warn(err);
                  lines++;
                  if (lines === total) {
                    sendEmail(snap.val().email, snap.key(), `report${snap.key()}.csv`);
                  }
                });
              });
            });
          });
      }
    });
  }
});
