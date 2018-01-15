const fs = require('fs');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const execSync = require('child_process').execSync;
const omx = require('node-omxplayer');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const player = new omx();

const root = '/media/video';
var current;

function dirlist (loc, items) {
  var dirs = items.filter((item) => {
    return !(item.match(/^\./) ||
      fs.statSync(path.join(root, loc, item)).isFile());
  });
  if (!dirs.length) return '';

  return '<ul><li>' + (dirs.map((item) => {
    return '<a href="?loc=' + encodeURIComponent(path.join(loc, item)) + '">' + item + '</a>';
  }).join('</li><li>')) + '</li></ul>';
}

function escapeQuotes (str) {
  // escape for single-quoted string
  return str.replace(/([\\"'])/g, (m,$1) => '\\' + $1);
}

function filelist (loc, items) {
  var files = items
    .filter((item) => fs.statSync(path.join(root, loc, item)).isFile() &&
      item.match(/\.(mp4|avi|mkv|vob)$/i) &&
      !item.match(/^\./));
  if (!files.length) return '';

  return '<ul><li>' + files.map((item) => {
    return `<span id="item" onclick="play('${escapeQuotes(loc)}', '${escapeQuotes(item)}')">${item}</span>`;
  }).join('</li><li>');
}

function crumbs (loc) {
  var html = '<a href="/"> video /</a> ';
  var dir = '';
  var parts = loc.split('/');
  var last = parts.pop();
  parts.forEach((part) => {
    dir += part;
    html += '<a href="?loc=' + encodeURIComponent(dir) + '"> ' + part + ' /</a> ';
    dir += '/';
  });
  return html + last;
}

app.get('/', (req, res) => {
  const loc = req.query.loc || '';

  fs.readdir(path.join(root, loc), (err, items) => {
    if (err) {
      console.error(err);
      res.send(err);
    } else {
      res.send(`<!doctype html>
        <html><head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>

        body {
          font-family: sans-serif;
          background: #fefcf6;
          color: #999;
        }

        ul {
          list-style: none;
          padding: 0;
        }

        a {
          color: #335;
        }

        a:visited {
          color: #755;
        }

        #item {
          color: #eee;
          background: #444;
          padding: 0.2em;
        }

        li {
          padding: 0.5em;
        }

        #current {
          margin: 0.5em 0 1.5em;
          min-height: 1em;
          color: #676;
          font-size: 0.85em;
        }

        #header {
          margin: 1em 0;
        }

        #playing {
          margin-top: 2em;
          text-align: center;
        }

        #loc {
          margin: 1em 0;
          white-space: nowrap;
        }

        button {
          -webkit-appearance: none;
          border: none;
          background: #444;
          color: #eee;
          line-height: 3.5em;
          padding: 0 1em;
          cursor: pointer;
          width: 4em;
        }

        #fwd600, #back600 {
          letter-spacing: -0.5ex;
        }

        #subtitles-button {
          margin-left: 1em;
          font-weight: bold;
        }

        button#random {
          font-weight: bold;
          margin: 0 0.5em 0 0.4em;
          background: #933;
        }

        @media screen and (min-width: 500px) { 
          button {
            font-size: 1.3em;
          }
        }

        #back600:before {
          content: "\\25C0 \\FE0E \\25C0 \\FE0E";
        }

        #back30:before {
          content: "\\25C0 \\FE0E";
        }

        #fwd600:before {
          content: "\\25B6 \\FE0E \\25B6 \\FE0E";
        }

        #fwd30:before {
          content: "\\25B6 \\FE0E";
        }

        main {
          max-width: 800px;
        }

        #crumbs {
          font-size: 1.3em;
        }

        #crumbs a {
          text-decoration: none;
        }

        </style>
        <script>
        function xhrPost(url, data, cb) {
          var xhr = new XMLHttpRequest();
          xhr.open('POST', url, true);
          xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
          var payload = '';
          for (var key in data) {
            payload += (payload.length ? '&' : '') +
              key + '=' + encodeURIComponent(data[key]);
          }

          xhr.onload = () => {
            if (xhr.status === 200) {
              if (typeof cb === 'function') {
                cb(xhr.responseText);
              }
            }
          }

          xhr.send(payload);
        }

        function updateCurrent(name) {
          document.getElementById('current').innerHTML = name;
        }

        function play (loc, name) {
          xhrPost('/play', { loc, name }, updateCurrent);
        }

        function random (loc) {
          xhrPost('/random', { loc }, updateCurrent);
        }

        const pause = () => xhrPost('/pause');
        const back30 = () => xhrPost('/back30');
        const fwd30 = () => xhrPost('/fwd30');
        const back600 = () => xhrPost('/back600');
        const fwd600 = () => xhrPost('/fwd600');
        const subtitles = () => xhrPost('/subtitles');

        </script>
        <title>Pi Media</title>
        </head><body><main>

        <div id="playing">

        <div id="controlbar">
        <button onclick="back600()"><div id="back600"></div></button>
        <button onclick="back30()"><div id="back30"></div></button>
        <button onclick="pause()"><div id="pause">&nbsp;&#10074;&#10074;&nbsp;</div></button>
        <button onclick="fwd30()"><div id="fwd30"></div></button>
        <button onclick="fwd600()"><div id="fwd600"></div></button>
        <button id="subtitles-button" onclick="subtitles()"><div id="subtitles">&#xff3f;</div></button>
        </div>

        <div id="current">${current || ''}</div>

        </div>

        <span id="loc">
        <button id="random" onclick="random('${escapeQuotes(loc)}')">?!</button>
        <span id="crumbs">${crumbs(loc)}</span>
        </div>

        ${dirlist(loc, items)}
        ${filelist(loc, items)}

        </main></body></html>`);
    }
  });
});

app.post('/random', (req, res) => {
  const cmd = 'find "' + path.join(root, req.body.loc) + '" ' +
    '-iname "*.mkv" -or -iname "*.avi" -or -iname "*.mp4" | ' +
    'egrep -iv "[ \\\/\\.\\-]sample[ \\/\\.\\-]" | ' +
    'shuf -n 1';
  const file = execSync(cmd).toString('utf8').replace(/\n$/, '');
  player.newSource(file, 'hdmi', false, null, true);
  current = file.slice(root.length + 1);
  res.send(current);
});

app.post('/play', (req, res) => {
  current = path.join(req.body.loc, req.body.name);
  player.newSource(path.join(root, current), 'hdmi', false, null, true);
  res.send(current);
});

app.post('/pause', (req, res) => {
  res.send(player.pause());
  res.send();
});

app.post('/back600', (req, res) => {
  player.back600();
  res.send();
});

app.post('/back30', (req, res) => {
  player.back30();
  res.send();
});

app.post('/fwd30', (req, res) => {
  player.fwd30();
  res.send();
});

app.post('/fwd600', (req, res) => {
  player.fwd600();
  res.send();
});

app.post('/fwd600', (req, res) => {
  player.fwd600();
  res.send();
});

app.post('/subtitles', (req, res) => {
  player.subtitles();
  res.send();
});

app.listen(3000, () => console.log('Example app listening on 3000'));
