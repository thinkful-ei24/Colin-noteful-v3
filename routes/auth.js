

const express = require('express');
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');
const config = require('../config.js');

const { JWT_SECRET } = require('../config');
const JWT_EXPIRY = require('../config').JWT_EXPIRY;

const options = {session: false, failWithError: true};

const localAuth = passport.authenticate('local', options);

function createAuthToken (user) {
  return jwt.sign({ user }, JWT_SECRET, {
    subject: user.username,
    expiresIn: JWT_EXPIRY
  });
}

const jwtAuth = passport.authenticate('jwt', { session: false, failWithError: true });

router.post('/refresh', jwtAuth, (req, res) => {
  const authToken = createAuthToken(req.user);
  res.json({ authToken });
});
/* ======= POST login endpoint ======= */

router.post('/', localAuth,  (req, res) => {
  const authToken = createAuthToken(req.user);
  res.json({ authToken  });
});


module.exports = router;
