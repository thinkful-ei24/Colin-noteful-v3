'use strict';

const express = require('express');
const Folder = require('../models/folder');
const router = express.Router();
const mongoose = require('mongoose');
const Note = require('../models/note')

/* ============ GET all items ========== */
router.get('/', (req, res, next) => {
  Folder.find()
    .sort({ name: 'desc' })
    .then(results => {
      console.log(results);
      res.json(results);

    })
    .catch(err => next(err));
});

/* ============ GET item by id ============ */
router.get('/:id', (req, res, next) => {

  let id = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('this `id` is not valid');
    err.status = 400;
    return next(err);
  }

  Folder.findById(id)

    .then(results => {
      if(results) {
        res.json(results);
      } else {
        next();
      }
    })
    .catch(err => next(err));
});


/* ========== POST a new folder ========== */
router.post('/', (req, res, next) => {

  const {name} = req.body;

  if (!name) {
    const err = new Error('Missing `title` in request body');
    err.status = 400;
    return next(err);
  }

  const newItem = {name: name};

  Folder.create(newItem)
    .then(result => {
      console.log(result);
      res.location(`${req.originalUrl}/${result.id}`).status(201).json(result);
    })
    .catch(err => {
      if (err.code === 11000) {
        err = new Error('The folder name already exists');
        err.status = 400;

      }
      next(err);

    });
});


/* =========== PUT update a folder by id =============*/
router.put('/:id', (req, res, next) => {
  if(!(req.params.id && req.body.id && req.params.id === req.body.id)) {
    const message = `Request path id ${req.params.id} and ${req.body.id} must match`;
    console.log(message);
  }

  const id = req.params.id;
  const toUpdate = {};
  const updateFields = ['name'];

  updateFields.forEach(field => {
    if(field in req.body) {
      toUpdate[field] = req.body[field];
    }
  });

  Folder.findByIdAndUpdate(id, toUpdate, {new: true})
    .then(result => {
      res.json(result);
    })
    .catch(err => {
      if (err.code === 11000) {
        err = new Error('The folder name already exists');
        err.status = 400;

      }
      next(err);
    });
});


/* =========== DELETE a folder ======== */
router.delete('/:id', (req, res, next) => {
  const { id  } = req.params;

  /***** Never trust users - validate input *****/
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }

  //ON DELETE SET NULL equivalent
  const folderRemovePromise = Folder.findByIdAndRemove( id  );
  // ON DELETE CASCADE equivalent
  // const noteRemovePromise = Note.deleteMany({ folderId: id  });

  const noteRemovePromise = Note.updateMany(
    { folderId: id  },
    { $unset: { folderId: ''  }  }
  );

  Promise.all([folderRemovePromise, noteRemovePromise])
    .then(() => {
      res.status(204).end();
    })
    .catch(err => {
      next(err);
    });
});

module.exports = router;
