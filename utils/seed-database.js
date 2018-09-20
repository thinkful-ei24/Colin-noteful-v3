const mongoose = require('mongoose');

const { MONGODB_URI } = require('../config');

const Note = require('../models/note');
const Folder = require('../models/folder');

const notes = require('../db/seed/notes');
const folders = require('../db/seed/folders');

mongoose.connect(MONGODB_URI, { useNewUrlParser:true })
  .then(() => mongoose.connection.db.dropDatabase())
  .then(() => {
    return Promise.all([
      Note.insertMany(notes),
      Folder.insertMany(folders),
      Folder.createIndexes(),
    ]);
  })
  .then(results => {
    console.info(`Inserted ${results.length} Notes`);
  })
  .then(() => mongoose.disconnect())
  .catch(err => {
    console.error(err);
  });
