'use strict';

const express = require('express');
const Note = require('../models/note.js');
const Folder = require('../models/folder.js');
const Tag = require('../models/tags.js');
const router = express.Router();
const mongoose = require('mongoose');
const passport= require('passport');


router.use(passport.authenticate('jwt', {session: false, failWithError: true}));


function folderIdBelongsToUser(folderId, userId) {
  if (!folderId) {
    return Promise.resolve(true);
  }
  if(!mongoose.Types.ObjectId.isValid(folderId)) {
    const err = new Error('The folderId is not valid');
    err.status = 400;
    return Promise.reject(err);
  }
  return Folder.findOne({_id: folderId, userId})
    .then(result => {
      if(result) {
        return Promise.resolve(true);
      } else {
        const err = new Error('the folder does not exist');
        err.status = 400;
        return Promise.reject(err);
      }
    });
}

function tagsBelongToUser(tags, userId) {
  if (!tags) {
    return Promise.resolve(true);
  }
  if (tags && !Array.isArray(tags)) {
    const err = new Error('The `tags` property must be an array');
    err.status = 400;
    return Promise.reject(err);
  }
  //if(tags && Array.isArray(tags)) {
  //  console.log(tags);
  //  tags.forEach(tag => {
  //    console.log(tag);
  //    if (!mongoose.Types.ObjectId.isValid(tag)) {
  //      const err = new Error('Not a valid `id`');
  //      err.status = 400;
  //      return Promise.reject(err);
  //    }
  //  });
  //}
  if(tags && Array.isArray(tags)) {
    for (let index in tags) {
      if (!mongoose.Types.ObjectId.isValid(tags[index])) {
        const err = new Error('Not a valid `id`');
        err.status = 400;
        return Promise.reject(err);
      }
    }
  }
  return Tag.find({$and: [{_id: {$in:tags}, userId}]})
    .then( result => {
      if(result.length !== tags.length) {
        const err = new Error('One or more tags are invalid');
        err.status = 400;
        return Promise.reject(err);
      } else {
        return Promise.resolve(true);
      }
    });
}





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

  const newItem = {
    title,
    content,
    tags,
    userId
  };

  if(mongoose.Types.ObjectId.isValid(folderId)) {
    newItem.folderId = folderId;
  }

  Promise.all([
    folderIdBelongsToUser(folderId, userId),
    tagsBelongToUser(tags, userId)
  ])
    .then(() => {
      return Note.create(newItem);
    })
    .then( result => {
      res.location(`${req.originalUrl}/${result.id}`).status(201).json(result);
    })
    .catch(err => {
      next(err);
    });


});

/* ========== PUT/UPDATE A SINGLE ITEM ========== */
router.put('/:id', (req, res, next) => {

  const id = req.params.id;
  const userId = req.user.id;
  const { title, content, folderId, tags } = req.body;
  const toUpdate = { title, content, userId, folderId, tags};

  if(!folderId || folderId === '') {
    delete toUpdate.folderId;
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('Not a valid `id`');
    err.status = 404;
    return next(err);
  }

  if (title === '') {
    const err = new Error('Missing `title` in request body');
    err.status = 400;
    return next(err);
  }

  if(mongoose.Types.ObjectId.isValid(folderId)) {
    toUpdate.folderId = folderId;
  }



  Promise.all([
    folderIdBelongsToUser(toUpdate.folderId, userId),
    tagsBelongToUser(toUpdate.tags, userId)
  ])
    .then(() => {
      return Note.findByIdAndUpdate(id, toUpdate, {new: true});
    })
    .then(result => {
      res.status(201).json(result);
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
