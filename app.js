// Copyright 2018 IBM Corp. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
//  Unless required by applicable law or agreed to in writing, software
//  distributed under the License is distributed on an "AS IS" BASIS,
//  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//  See the License for the specific language governing permissions and
//  limitations under the License.

var express = require('express');
var cfenv = require('cfenv');
var bodyParser = require('body-parser');
var app = express();
var session = require('express-session');
var hash = require('pbkdf2-password')()
var path = require('path');
var aws = require('ibm-cos-sdk');
aws.config.update({"accessKeyId": "a03ba2f126044de38916a5beb30dad1c", "secretAccessKey": "d9428cb3f779881d8940d1b467612480406cd748f2dcc080", "region": "us-south"});

// serve the files out of ./public as our main files
app.use(express.static('public'));
app.set('views', './src/views');
app.set('view engine', 'ejs');
app.use(bodyParser.json());

//middleware
app.use(express.urlencoded({ extended: false }))
app.use(session({
  resave: false, // don't save session if unmodified
  saveUninitialized: false, // don't create session until something stored
  secret: 'very secret'
}));

app.use(function(req, res, next){
  var err = req.session.error;
  var msg = req.session.success;
  delete req.session.error;
  delete req.session.success;
  res.locals.message = '';
  if (err) res.locals.message = '<p class="msg error">' + err + '</p>';
  if (msg) res.locals.message = '<p class="msg success">' + msg + '</p>';
  next();
});

// dummy database

var users = {
  session1: { name: 'session1' },
  session2: { name: 'session2' }
};

// when you create a user, generate a salt
// and hash the password ('foobar' is the pass here)

hash({ password: 'password1' }, function (err, pass, salt, hash) {
  if (err) throw err;
  // store the salt & hash in the "db"
  users.session1.salt = salt;
  users.session1.hash = hash;
});
hash({ password: 'password2' }, function (err, pass, salt, hash) {
  if (err) throw err;
  // store the salt & hash in the "db"
  users.session2.salt = salt;
  users.session2.hash = hash;
});


// Authenticate using our plain-object database!

function authenticate(name, pass, fn) {
  if (!module.parent) console.log('authenticating %s:%s', name, pass);
  var user = users[name];
  // query the db for the given username
  if (!user) return fn(new Error('cannot find user'));
  // apply the same algorithm to the POSTed password, applying
  // the hash against the pass / salt, if there is a match we
  // found the user
  hash({ password: pass, salt: user.salt }, function (err, pass, salt, hash) {
    if (err) return fn(err);
    if (hash === user.hash) return fn(null, user)
    fn(new Error('invalid password'));
  });
}

function restrictS1(req, res, next) {
    if(req.session.user){
        if (req.session.user.name == 'session1') {
            next();
        }else{
            req.session.error = 'Session 1 Access denied!';
            res.send('No access to Session 1, click to <a href="/login">login</a>');
        }
    } else {
      req.session.error = 'Session 1 Access denied!';
      res.send('No access to Session 1, click to <a href="/login">login</a>');
    }
}

function restrictS2(req, res, next) {
    if(req.session.user){
        if (req.session.user.name == 'session2') {
            next();
        }else{
            req.session.error = 'Session 2 Access denied!';
            res.send('No access to Session 2, click to <a href="/login">login</a>');
        }
    } else {
      req.session.error = 'Session 2 Access denied!';
      res.send('No access to Session 2, click to <a href="/login">login</a>');
    }
}


var title = 'Session Gallery';
app.get('/', function(req, res){
  res.redirect('/login');
});
// Serve index.ejs
// serve home.ejs
app.get('/login', function (req, res) {
  res.render('home', {
    title: 'Home',
  });
  //res.render('index', {status: '', title: title});
});


app.get('/logout', function(req, res){
  // destroy the user's session to log them out
  // will be re-created next request
  req.session.destroy(function(){
    res.redirect('/');
  });
});


app.post('/login', function(req, res){
  authenticate(req.body.username, req.body.password, function(err, user){
    if (user) {
      // Regenerate session when signing in
      // to prevent fixation
      req.session.regenerate(function(){
        // Store the user's primary key
        // in the session store to be retrieved,
        // or in this case the entire user object
        req.session.user = user;
        req.session.success = 'Authenticated as ' + user.name
          + ' click to <a href="/logout">logout</a>. '
          + ' You may now access <a href="/restricted">/restricted</a>.';
        if (user.name == 'session1'){
            res.redirect('/galleryS1');
        }
        if (user.name == 'session2'){
            res.redirect('/galleryS2');
        }

      });
    } else {
      req.session.error = 'Authentication failed, please check your '
        + ' username and password.'
        + ' (use "tj" and "foobar")';
      res.redirect('/login');
    }
  });
});

var galleryRouterS1 = require('./src/routes/galleryRoutesS1')(title);
var galleryRouterS2 = require('./src/routes/galleryRoutesS2')(title);

app.use('/galleryS1',restrictS1, galleryRouterS1);
app.use('/galleryS2',restrictS2, galleryRouterS2);


// get the app environment from Cloud Foundry
var appEnv = cfenv.getAppEnv();

// start server on the specified port and binding host
var port = process.env.PORT || 3000;
app.listen(port, function() {
    console.log("Start web server");
});
