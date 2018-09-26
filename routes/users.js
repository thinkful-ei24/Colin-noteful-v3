'use strict';

const mongoose = require('mongoose');
const User = require('../models/user.js');
const express = require('express');
const router = express.Router();


/* =========== POST creates a new user ============ */

router.post('/', (req, res, next) => {

  const username = req.body.username; // same as { username  } = req.body
  const password = req.body.password; // same as { password } = req.body
  let fullname = req.body.fullname;

  //*** validation checks ***
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

  //checks to make sure the fields `username`, `password`, and `fullName` are strings
  const stringFields = ['username', 'password', 'fullname'];
  const nonStringFields = stringFields.find(field => field in req.body && typeof req.body[field] !== 'string');

  if (nonStringFields) {
    return res.status(422).json({
      code: 422,
      reason: 'Validation Error',
      message: 'Incorrect field type: expected string',
      location: nonStringFields
    });
  }

  //username and password should not have leading/trailing whitespace
  const explicitlyTrimFields = ['username', 'password'];
  const nonTrimField = explicitlyTrimFields.find(field => req.body[field].trim() !== req.body[field]);

  if (nonTrimField) {
    return res.status(422).json({
      code: 422,
      reason: 'Validation Error',
      message: 'username and password must not start or end with whitespace',
      location: nonTrimField
    });
  }

  if(fullname) {
    fullname = fullname.trim();
  }

  //username must be a minimum of 1 character long
  if(username.length < 1) {
    return res.status(422).json({
      code: 422,
      reason: 'Validation Error',
      message: 'username must be at least 1 character long... but you should probably make it longer',
      location: 'username'
    });
  }

  //password must be between 8 and 72 characters long
  if (password.trim().length < 8 || password.trim().length > 72) {
    return res.status(422).json({
      code: 422,
      reason: 'Validation Error',
      message: 'Password must be between 8 and 72 characters',
      location: 'password'
    });
  }

  User.hashPassword(password)
    .then(digest => {
      const newUser = {
        username,
        password: digest,
        fullname
      };
      return User.create(newUser);
    })
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
