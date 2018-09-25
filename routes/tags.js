'use strict';

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const passport = require('passport');
const Note = require('../models/note.js');
const Folder = require('../models/folder.js');
const Tag = require('../models/tags.js');


router.use(passport.authenticate('jwt', {session: false, failWithError: true}));
/* ========== GET all tags ========= */
router.get('/', (req, res, next) => {


  Tag
    .find()
    .sort({ name: 'desc' })
    .then(results => {
      res.json(results);
    })
    .catch(err => {
      next(err);
    });
});

/* =========== GET tag by id ========= */
router.get('/:id', (req, res, next) => {

  let { id } = req.params;

  if(!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('this `id` is not valid');
    err.status = 400;
    return next(err);
  }

  Tag
    .findById(id)
    .then(results => {
      if(results) {
        res.json(results);
      } else {
        next();
      }
    })
    .catch(err => next(err));
});

/* ============== POST a new tag ============== */
router.post('/', (req, res, next) => {

  const { name } = req.body;

  if(!name) {
    const err = new Error('Missing `title` in request body');
    err.status = 400;
    return next(err);
  }

  const newTag = {name: name};

  Tag.create(newTag)
    .then(results => {
      if(results) {
        res.location(`${req.originalUrl}/${results.id}`).status(201).json(results);
      } else {
        next();
      }
    })
    .catch(err => {
      if (err.code === 11000) {
        err = new Error('The Tag name already exists. We dont need another one.  \nLike... seriously just use the one thats already there');
        err.status = 400;
      }
      next(err);
    });
});


/*=============== PUT update a folder by id ================== */
router.put('/:id', (req, res, next) => {

  const id = req.params.id;
  const { name } = req.body;
  const toUpdate = {
    name: name,
  };

  if(!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('this `id` is not valid');
    err.status = 400;
    return next(err);
  }

  if(!toUpdate.name) {
    const err = new Error('Missing `title` in the request body');
    err.status = 400;
    return next(err);
  }

  Tag
    .findByIdAndUpdate(id, toUpdate, {new: true})
    .then(result => {
      if (result) {
        res.json(result);
      } else {
        next();
      }
    })
    .catch(err => {
      if (err.code === 11000) {
        err = new Error('The tag name already exists');
        err.status = 400;
      }
      next(err);
    });
});

router.delete('/:id', (req, res, next) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }

  const tagRemovePromise = Tag.findByIdAndRemove(id);
  const noteUpdatePromise = Note.updateMany(
    {tags: id},
    {$unset: {tags: ''}}
  );

  Promise.all([tagRemovePromise, noteUpdatePromise])
    .then(() => {
      res.sendStatus(204).end();
    })
    .catch(err => next(err));
});

module.exports = router;
