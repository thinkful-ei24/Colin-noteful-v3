const mongoose = require('mongoose');
const { MONGODB_URI } = require('../config');

const Note = require('../models/note');

mongoose.connect(MONGODB_URI, { useNewUrlParser:true })
  .then(() => {
    const searchTerm = 'aaaaaarrrrrrr';
    let filter = {};

    if (searchTerm) {
      const expr = RegExp(searchTerm, 'gi');
      filter = {$or: [{'title': expr}, {'content': expr}]};
     }
     return Note.find(filter).sort({ updatedAt: 'desc' });
   })
    .then(results => {

     console.log(results);
   })
   .then(() => {
     return mongoose.disconnect()
   })
   .catch(err => {
     console.error(`ERROR: ${err.message}`);
     console.error(err);
   });


mongoose.connect(MONGODB_URI, { useNewUrlParser:true })
  .then(() => {
    const foundNote = Note.findById('000000000000000000000005');
    return foundNote;
  })
  .then(results => {
    console.log(results);
  })
  .then(() => {
    return mongoose.disconnect();
  })
  .catch(err => {
    console.error(`ERROR: ${err.message}`); /* eslint-disable-line no-console */
    console.error(err); /* eslint-disable-line no-console */
  });

mongoose.connect(MONGODB_URI, { useNewUrlParser:true })
  .then(() => {
    const updateObj = {title: 'How to add a new note', content: 'you hardwire it into your function, at least in this challenge...'};
    //this code is pointless here, since we are hardcoding our created object but will be useful in error checking
    if (!updateObj.title) {
      const message = `new object must contain a title`;
      console.error(message);  /* eslint-disable-line no-console */
    }
    return Note.create(updateObj);
  })
  .then(results => {
    console.log(results); /* eslint-disable-line no-console */
  })
  .catch(err => console.error(err));  /* eslint-disable-line no-console */

 mongoose.connect(MONGODB_URI, { useNewUrlParser:true })
   .then(() => {
     const updateObj = {title: 'foooooooo', content: 'baaaaaaarrrrrrr', _id:'000000000000000000000002'};
     const id = '000000000000000000000002';
     //validation code.  useless in this challenge but will ned when transfering to actual noteful app
     if(!(id && updateObj.id && id === updateObj.id)) {
       const message = `Request path id ${id} and ${updateObj.id} must match`;
       console.error(message); /* eslint-disable-line no-console */
     }
     return Note.findByIdAndUpdate(id, updateObj, {new: true});
   })
   .then(result => {
     console.log(result);
   })
   .catch(err => console.error(err));

//  mongoose.connect(MONGODB_URI, { useNewUrlParser:true })
//    .then(() => {
//      const id = '000000000000000000000002';
//      Note.findByIdAndRemove(id);
//    })
//    .then(() => console.log('deleted item with ID 000000000000000000000002')
//    .catch(err => console.error(err))


