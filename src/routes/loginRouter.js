/**
 * Module dependencies.
 */

var express = require('express');

var loginRouter = express.Router();


var router = function(title) {

    loginRouter.route('/')

        .post(
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
                  res.redirect('/gallery');
                });
              } else {
                req.session.error = 'Authentication failed, please check your '
                  + ' username and password.'
                  + ' (use "session1" and "password1")';
                res.redirect('/login');
              }
          }));



    return loginRouter;
};

module.exports = router;
