'use strict';

const express = require('express');
const Note = require('../models/note.js');
const router = express.Router();
const mongoose = require('mongoose');
const passport= require('passport');


router.use(passport.authenticate('jwt', {session: false, failWithError: true}));

/* ========== GET/READ ALL ITEMS ========== */
router.get('/', (req, res, next) => {
  let searchTerm = req.query.searchTerm;
  let folderId = req.query.folderId;
  let tagId = req.query.tagId;
  const userId = req.user.id;

  let filter = { userId: userId };

  if (searchTerm) {
    const expr = RegExp(searchTerm, 'gi');
    filter = {$or: [{'title': expr}, {'content': expr}]};
  }

  if(folderId) {
    filter.folderId = folderId;
  }

  if(tagId) {
    filter.tags = tagId;
  }

  Note
    .find(filter)
    .populate('tags')
    .then(results => {
      res.json(results);
    })
    .catch(err => next(err));
});

/* ========== GET/READ A SINGLE ITEM ========== */
router.get('/:id', (req, res, next) => {

  let id = req.params.id;
  const userId = req.user.id;

  //test for valid id
  if(!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('not a valid note ID');
    err.status = 400;
    return next(err);
  }

  Note.find({userId: userId,
    _id: id
  })
    .populate('folderId')
    .populate('tags')
    .then(([result]) => {
      if (result) {
        res.json(result);
      } else {
        next();
      }
    })
    .catch(err => {
      next(err);
    });
});

/* ========== POST/CREATE AN ITEM ========== */
router.post('/', (req, res, next) => {

  const { title, content, folderId, tags = [] } = req.body;
  const userId = req.user.id;

  if(!title) {
    const err = new Error('Missing `title` in request body');
    err.status = 400;
    return next(err);
  }

  if(tags) {
    tags.forEach(tag => {
      if (!mongoose.Types.ObjectId.isValid(tag.id)) {
        const err = 'Not a valid `id`';
        err.status = 400;
        return next(err);
      }
    });
  }

  const newItem = {
    title: title,
    content: content,
    folderId: folderId,
    tags: tags,
    userId: userId
  };

  Note.create(newItem)
    .then( result => {
      res.location(`${req.originalUrl}/${result.id}`).status(201).json(result);
    })
    .catch(err => next(err));
  //console.log('Create a Note');
  //res.location('path/to/new/document').status(201).json({ id: 2, title: 'Temp 2' });

});

/* ========== PUT/UPDATE A SINGLE ITEM ========== */
router.put('/:id', (req, res, next) => {

  const id = req.params.id;
  const updateFields = ['title', 'content', 'folderId', 'tags'];
  const userId = req.user.id;
  const toUpdate = {userId: userId};

  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('Not a valid `id`');
    err.status = 404;
    return next(err);
  }

  updateFields.forEach(field => {
    if (field in req.body) {
      toUpdate[field] = req.body[field];
    }
  });

  if(toUpdate.tags !== undefined) {
    toUpdate.tags.forEach(tag => {
      if (!mongoose.Types.ObjectId.isValid(tag.id)) {
        const err = new Error('Not a valid `id`');
        err.status = 400;
        return next(err);
      }
    });
  }

  if (!toUpdate.title) {
    const message = new Error('Missing `title` in request body');
    message.status = 400;
    return next(message);
  }

  Note.findByIdAndUpdate(id, toUpdate, {new: true})
    .then(result => {
      if(result) {
        res.json(result);
      } else {
        next();
      }
    })
    .catch(err => next(err));

});

/* ========== DELETE/REMOVE A SINGLE ITEM ========== */
router.delete('/:id', (req, res, next) => {
  const id = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }

  Note.findByIdAndRemove(id)
    .then(() => {
      res.sendStatus(204).end();
    })
    .catch(err => next(err));
});

module.exports = router;
