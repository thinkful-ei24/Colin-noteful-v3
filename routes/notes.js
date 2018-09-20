'use strict';

const express = require('express');
const Note = require('../models/note.js');
const router = express.Router();
const mongoose = require('mongoose');

/* ========== GET/READ ALL ITEMS ========== */
router.get('/', (req, res, next) => {
  let searchTerm = req.query.searchTerm;
  let folderId = req.query.folderId;

  let filter = {};
  if (searchTerm) {
    const expr = RegExp(searchTerm, 'gi');
    filter = {$or: [{'title': expr}, {'content': expr}]};
  }

  if(req.query.folderId) {
    Note
      .find(filter)
      .where('folderId', folderId)
      .then(results => {
        res.json(results);
      })
      .catch(err => next(err));
  } else {
    Note.find(filter)
      .sort({ updatedAt: 'desc' })
      .then(results => {
        res.json(results);
      })
      .catch(err => next(err));
  }
});

/* ========== GET/READ A SINGLE ITEM ========== */
router.get('/:id', (req, res, next) => {

  let id = req.params.id;

  //test for valid id
  if(!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('not a valid note ID');
    err.status = 400;
    return next(err);
  }

  Note.findById(id)
    .populate('folderId')
    .then(result => {
      if (result) {
        res.json(result);
      } else {
        next();
      }
    })
    .catch(err => {
      next(err);
    });



  //  this is my solution.  Above is the copied-from-answer-key solution
  //  Note.findById(id)
  //    .then((results) => {
  //       res.json(results);
  //    })
  //    .catch(err =>  {
  //      next(err);
  //    });
});

/* ========== POST/CREATE AN ITEM ========== */
router.post('/', (req, res, next) => {
  const { title, content, folderId } = req.body;
  console.log(title);
  if(!title) {
    const err = new Error('Missing `title` in request body');
    err.status = 400;
    return next(err);
  }

  const newItem = {
    title: title,
    content: content,
    folderId: folderId
  };

  Note.create(newItem)
    .then( result => {
      res.status(201).json(result);
    })
    .catch(err => next(err));
  //console.log('Create a Note');
  //res.location('path/to/new/document').status(201).json({ id: 2, title: 'Temp 2' });

});

/* ========== PUT/UPDATE A SINGLE ITEM ========== */
router.put('/:id', (req, res, next) => {
  if(!(req.params.id && req.body.id && req.params.id === req.body.id)) {
    const message = `Request path id ${req.params.id} and ${req.body.id} must match`;
    console.error(message);
  }

  const id = req.params.id;
  const toUpdate = {};
  const updateFields = ['title', 'content', 'folderId'];

  updateFields.forEach(field => {
    if (field in req.body) {
      toUpdate[field] = req.body[field];
    }
  });

  Note.findByIdAndUpdate(id, toUpdate, {new: true})
    .then(result => {
      res.json(result);
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
