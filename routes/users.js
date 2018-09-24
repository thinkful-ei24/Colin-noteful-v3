'use strict';

const mongoose = require('mongoose');
const User = require('../models/user.js');
const express = require('express');
const router = express.Router();


/* =========== POST creates a new user ============ */

router.post('/', (req, res, next) => {

  const username = req.body.username; // same as { username  } = req.body
  const password = req.body.password; // same as { password } = req.body
  const fullName = req.body.fullName;

  // *** validation checks ***
  //checks to make sure user has a username and password
  const requiredFields = ['username', 'password'];
  const missingField = requiredFields.find(field => !(field in req.body));

  if(missingField) {
    return res.status(422).json({
      code: 422,
      reason: 'Validation Error',
      message: 'Missing required field',
      location: missingField
    });
  }

  // check to make sure username doesn't already exist
  return User.find({username})
    .count()
    .then(count => {
      if(count > 0) {
        return Promise.reject({
          code: 422,
          reason: 'Validation Error',
          message: 'Username is already taken',
          location: 'username'
        });
      }
      return User.hashPassword(password);
    })
    .then(digest => {
      console.log(digest);
      return User.create({
        username,
        password: digest,
        fullName
      });
    })
    .then(user => {
      return res.status(201).location(`/api/users/${user.id}`).json(user.serialize());
    })
    .catch(err => {
      if (err.reason === 'ValidationError') {
        return res.status(err.code).json(err);
      }
      res.status(500).json({code: 500, message: 'Internal server error'});
    });

});

module.exports = router;
