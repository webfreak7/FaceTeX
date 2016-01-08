var http = require('http');
var config = require('./config.json');
var fs = require('fs');
var login = require('facebook-chat-api');
var mathmode = require('mathmode');
var mjAPI = require("./node_modules/mathjax-node/lib/mj-single");
var async = require('async');
var results = [];
var options = {
  packages: ["amsmath", "amssymb"]
};
var http = require('http');
var port = process.env.PORT || 5000;


http.createServer(function(req, res) {
  console.log("ping");
  res.writeHead(200, {
    'Content-Type': 'text/plain'
  });
  res.end("");
}).listen(process.env.PORT || 5000);

setInterval(function() {
  http.get("http://facetex.herokuapp.com", function(res) {
    console.log("pong");
  });
}, 300000);


function isValidLatex(inputString) {
  return (inputString.slice(0, 1) === '$' &&
    inputString.slice(-1) === '$' &&
    inputString !== '$');
}

function extractLatex(inputString) {
  var length = inputString.length;
  return inputString.slice(1, length - 1);
}

function populateResults(inputString) {
  var resultArray = inputString.split("");

  var inMiddle = false;

  for (var i = 0; i < resultArray.length; i++) {
    if (resultArray[i] === '$') {

      if (!inMiddle) {
        results.push("");
      }
      inMiddle = !inMiddle;
    } else {
      if (inMiddle) {
        results[results.length - 1] += resultArray[i];
      }
    }

  }

}

login({
  email: process.env.FB_USERNAME || config.username,
  password: process.env.FB_PASSWORD || config.password
}, function callback(err, api) {
  if (err) return console.error(err);
  api.setOptions({
    listenEvents: true
  });
  var interpret = api.listen(function(err, event) {
    if (err) return console.error(err);

    if (event.type === "message") {

        //console.log(isValidLatex(event.body));
        populateResults(event.body);


        console.log(results);

        mjAPI.start();

        mjAPI.config({
            MathJax: {
              SVG: {
                font: "TeX"
              }
            },
            extensions: ""
          });

        for (var i = 0; i < results.length; i++) {

          mjAPI.typeset({
            math: results[i],
            format: "inline-TeX", // "inline-TeX", "MathML"
            png: true, //  svg:true,
            dpi: 800,
            ex: 50,
            width: 100
          }, function(data) {
            console.log(data);
            if (!data.errors) {

              var base64Data = data.png.replace(/^data:image\/png;base64,/, "");

              fs.writeFile('file' + i + '.png', base64Data, 'base64', function(err) {
                if (err) {
                  throw err;
                } else {
                  var msg = {
                    attachment: fs.createReadStream('file' + i + '.png')
                  };
                  console.log('hey');
                  api.sendMessage(msg, event.threadID);
                }

              });
            }
          });

        } // end of for loop

        results = [];

        api.markAsRead(event.threadID, function(err) {
          if (err) console.log(err);
        });
    }
  });
});
