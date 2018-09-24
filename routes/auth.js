

const express = require('express');
const router = express.Router();
const passport = require('passport');

const options = {session: false, failWithError: true};

const localAuth = passport.authenticate('local', options);

/* ======= POST login endpoint ======= */

router.post('/', localAuth,  (req, res) => {
  return res.json(req.user);
});


module.exports = router;
