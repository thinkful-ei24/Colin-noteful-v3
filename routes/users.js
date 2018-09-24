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
  //  const requiredFields = ['username', 'password'];
  //  const missingField = requiredFields.find(field => !(field in req.body));
  //
  //  if(missingField) {
  //    return res.status(422).json({
  //      code: 422,
  //      reason: 'Validation Error',
  //      message: 'Missing required field',
  //      location: missingField
  //    });
  //  }

  //check to make sure username doesn't already exist
  //  User.hashPassword(password)
  //  .then(digest => {
      User.create({
        username,
        password: digest,
        fullName
      })
  //})
    .then(user => {
      return res.status(201).location(`/api/users/${user.id}`).json(user);
    })
    .catch(err => {
      console.log(err);
      if (err.code === 11000) {
        err = new Error('The username already exists');
        err.status= 400;
      }
      next(err);
    });

});

module.exports = router;
