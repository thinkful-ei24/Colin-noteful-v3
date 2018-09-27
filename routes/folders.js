'use strict';

const express = require('express');
const Folder = require('../models/folder');
const router = express.Router();
const mongoose = require('mongoose');
const Note = require('../models/note');
const passport = require('passport');

router.use(passport.authenticate('jwt', {session: false, failWithError: true}));

/* ============ GET all items ========== */

router.get('/', (req, res, next) => {

  const userId = req.user.id;

  Folder.find({userId: userId})
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
  let userId = req.user.id;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('this `id` is not valid');
    err.status = 400;
    return next(err);
  }

  Folder.findOne({userId, _id: id})
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
  const userId = req.user.id;
  if (!name) {
    const err = new Error('Missing `title` in request body');
    err.status = 400;
    return next(err);
  }

  const newItem = {
    name,
    userId
  };

  Folder.create(newItem)
    .then(result => {
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

  const { id } = req.params;
  const userId = req.user.id;
  const toUpdate = {userId};
  const updateFields = ['name'];

  updateFields.forEach(field => {
    if(field in req.body) {
      toUpdate[field] = req.body[field];
    }
  });


  if(!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    next(err);
  }

  Folder.findByIdAndUpdate(id, toUpdate, {new: true})
    .then(result => {
      if(result) {
        res.json(result);
      } else {
        next();
      }
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
