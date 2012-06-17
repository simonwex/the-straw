/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

var 
events = require('events'),
https = require('https'),
http = require('http'),
// redis = require("redis"),
util = require('util');


function Worker(requests, ua, options){

  if(false === (this instanceof Worker)) {
    return new Worker(filename, ua, options);
  }
  events.EventEmitter.call(this);

  var self = this;

  this.beginningOfTime = Date.now();
  this.repeat = !!options.repeat;
  
  this.requests = requests;
  this.currentStep = 0;
  this.cookies = {};
  this.done = false;

  
  this.go = function(){
    // Randomly start within 10 seconds
    setTimeout(self.next, Math.floor(Math.random() * 10000))
  };

  this.next = function(){
    
    if (self.currentStep == self.requests.length){
      self.currentStep = 0;
      self.emit('done');
      if (!self.repeat){
        return;
      }
    }
    

    var options = self.requests[self.currentStep];
    
    self.currentStep++;

    // JS doesn't execute stuff if the delay is 0.
    if (!options.delay || options.delay == 0)
      options.delay = 1;

    
    // console.log("# next delay: " + options.delay);
    self.timeout = setTimeout(
      function(){
        var client;
        if (options.protocol == 'https:'){
          client = https;
        }
        else{
          client = http;
        }

        var createdAt = Date.now();
        var request = client.request({
          host: options.host,
          path: options.path,
          port: options.port,
          headers: options.headers,
          method: options.method
        },
        function(response){
          console.log(JSON.stringify({
            'url': options.url,
            'responseTime': Date.now() - createdAt,
            'date': Date.now().toString(),
            'createdAt': new Date(createdAt).toString(),
            'now': new Date().toString(),
            'sinceBeginningOfTime': Date.now() - self.beginningOfTime
          }));

          // console.log('STATUS: ' + response.statusCode);
          // TODO: Save cookies
          // TODO: validate expected statusCode.
          // console.log('HEADERS: ' + JSON.stringify(response.headers));
          self.next();
        });
        request.on('error', function(e){
          console.log('Error response from URL: ' + options.url);
          self.next();
        });

        if (options.data){
          // request.write(data);
          // request.write("\n");
        }
        request.end();
        
      },
      options.delay
    );
  
  };
}

util.inherits(Worker, events.EventEmitter);

Worker.prototype

module.exports = Worker;

