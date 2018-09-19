'use strict';

const express = require('express');
const Note = require('../models/note.js');
const router = express.Router();
const mongoose = require('mongoose');

/* ========== GET/READ ALL ITEMS ========== */
router.get('/', (req, res, next) => {
  let searchTerm = req.query.searchTerm;
  let filter = {};
  if (searchTerm) {
    const expr = RegExp(searchTerm, 'gi');
    filter = {$or: [{'title': expr}, {'content': expr}]};
  }

  Note.find(filter)
    .sort({ updatedAt: 'desc' })
    .then(results => {
      res.json(results);
    })
    .catch(err => next(err));
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
    .then((results) => {
       res.json(results);
    })
    .catch(err =>  {
      next(err);
    });
});

/* ========== POST/CREATE AN ITEM ========== */
router.post('/', (req, res, next) => {
  const { title, content } = req.body;
  console.log(title);
  if(!title) {
    const err = new Error('Missing `title` in request body');
    err.status = 400;
    return next(err);
  }

  const newItem = {
    title: title,
    content: content,
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
  if(!(req.params.id && req.body.id && req.params.id === req.body.id)) {
    const message = `Request path id ${req.params.id} and ${req.body.id} must match`;
    console.error(message);
  }

  const id = req.params.id;
  const toUpdate = {};
  const updateFields = ['title', 'content'];

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
  Note.findByIdAndRemove(id)
    .then(() => {
      res.sendStatus(204).end();
    })
    .catch(err => next(err));
});

module.exports = router;
