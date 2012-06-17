/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

const
lazy = require('lazy'),
Url = require('url'),
fs = require('fs');

// Lower case is intentional
const requestHeadersWeCareAbout = [
  'content-type',
  'accept'
];

const responseHeadersWeCareAbout = [
  'content-type',
  'date'
];


function trim(s){
  return s.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
}

function State(states, first){
  if (typeof(first) == 'undefined'){
    first = this
  }
  this.name = states.shift();
  
  if (states.length > 0)
    this.next = new State(states, first);
  else
    this.next = first;

  return this;
}

module.exports = function(filename, allowedDomains, allowedContentTypeRegex, callback){
  // TODO: Check if the file exists etc.

  var state = new State([
    'new',
    'before_request',
    'request',
    'request_headers',
    // 'before_response',
    'response',
    'response_headers',
  ]);
  
  var 
  request,
  lastTimeStamp,
  lastLine,
  requests = [];

  
  lazy(fs.createReadStream(filename))
    .lines
    .map(String)
    .on('pipe', function(){
      // Get the last one.
      if (request.responseHeaders['content-type'].match(allowedContentTypeRegex)){
        if (~allowedDomains.indexOf(request.host)){
          requests.push(request);
        }
        else{
          console.warn("Ignoring host: " + request.host);
        }
      }
      else{
        console.warn("Ignoring request for type: " + request.responseHeaders['content-type']);
      }
      if (typeof(callback) == 'function')
        callback(null, requests);
      else
        throw "Error: Callback not provided to parser.";
    })
    .forEach(function(line){
      // Skip things we don't care about
      switch (state.name){
        case 'new':
          if (request){
            if (!('content-type' in request.responseHeaders) || request.responseHeaders['content-type'].match(allowedContentTypeRegex)){
              if (~allowedDomains.indexOf(request.host)){
                requests.push(request);
              }
              else{
                console.warn("Ignoring host: " + request.host);
              }
            }
            else{
              console.warn("Ignoring request for type: " + request.responseHeaders['content-type']);
            }

          }
          request = {headers: {}, responseHeaders: {}};

          var url = Url.parse(line);
          request.url = trim(line);
          request.protocol = url.protocol;
          request.host = url.host
          
          if ('port' in url){
            request.port = parseInt(port);
          }
          else if (url.protocol == 'https:'){
            request.port = 443;
          }
          else{
            request.port = 80;
          }

          state = state.next;
          break;
        case 'before_request':
          state = state.next;
          break;
        case 'before_response':
          state = state.next;
          break;
        case 'request':
          var parts = line.split(' ', 3);
          request['method'] = parts[0];
          request['path'] = parts[1];
          state = state.next;
          break;
        case 'request_headers':
          if (line.match(/^HTTP\/.*?\d\d\d .*?/)){
            request['data'] = trim(lastLine);
            if (request.data == ""){
              request.data = null;
            }
            state = state.next // We move onto response and don't break.  
          }
          else{
            var parts = line.split(': ', 2);
            
            if (~requestHeadersWeCareAbout.indexOf(parts[0].toLowerCase())){
              request.headers[parts[0].toLowerCase()] = trim(parts[1]);
            }
            break;
          }
        case 'response':
          var parts = line.split(' ', 3);
          request['expectedStatus'] = parts[1]
          state = state.next;
          break;
        case 'response_headers':
          if (trim(line) === "----------------------------------------------------------"){
            state = state.next;
            break;
          }

          var parts = line.split(': ', 2);
          if (parts[0].toLowerCase() == 'content-type'){
            request.responseHeaders['content-type'] = trim(parts[1]);
          }
          
          if (parts[0].toLowerCase() == 'date'){
            if (lastTimeStamp){
              request.delay = Date.parse(parts[1]) - Date.parse(lastTimeStamp)
              if (request.delay < 0)
                request.delay = 0;
            }
            else{
              request.delay = 0;
            }
            
            lastTimeStamp = parts[1];
          }
          if (~responseHeadersWeCareAbout.indexOf(parts[0])){
            request.responseHeaders[parts[0].toLowerCase()] = trim(parts[1]);
          }

          break;
        default: 
          console.error("Unexpected state. Exiting...");
          process.exit();
      }
      lastLine = line;
    });
}


