#!/usr/bin/env node

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

const
Worker = require('./session/worker'),
fs = require('fs'),
parseSession = require('./session/parser');

var userAgents = fs.readFileSync('./data/user_agents.txt', 'utf-8').split("\n");

function getRandomUa(){
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

var workers = 0;

var workerCount = parseInt(process.argv[3]);
var file = process.argv[2];

console.warn("Using session file: " + file + " with " + workerCount + " workers.");

parseSession(file, ['webmaker.org', 'thimble.webmaker.org'], /(^text)|(javascript)/, function(err, requests){
  if (err){
    console.log(err);
    return;
  }


  for (var i=0; i<workerCount; i++){

    workers++;
    var worker = new Worker(requests, getRandomUa(), {repeat: true});

    worker.on('done', function(){
      console.warn("Worker finished session sequence.");
    });

    worker.go();
  }
  
  // 
});
