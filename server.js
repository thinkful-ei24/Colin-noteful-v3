'use strict';

const express = require('express');
const morgan = require('morgan');
const mongoose = require('mongoose');
const passport = require('passport');

const { PORT, MONGODB_URI } = require('./config');

const notesRouter = require('./routes/notes');
const tagsRouter = require('./routes/tags');
const foldersRouter = require('./routes/folders');
const usersRouter = require('./routes/users.js');
const authRouter = require('./routes/auth.js');
const jwtStrategy = require('./passport/jwt.js');



// Create an Express application
const app = express();

// Log all requests. Skip logging during
app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'common', {
  skip: () => process.env.NODE_ENV === 'test'
}));

//Configure passport to utilize the local user authentication strategy
const localStrategy = require('./passport/local.js');
passport.use(localStrategy);

//Configure passpot to use JWT authentication strategy
passport.use(jwtStrategy);

// Create a static webserver
app.use(express.static('public'));

// Parse request body
app.use(express.json());

// Mount routers
app.use('/api/login', authRouter);

app.use('/api/users', usersRouter);

app.use('/api/folders', foldersRouter);

app.use('/api/notes', notesRouter);

app.use('/api/tags', tagsRouter);

// Custom 404 Not Found route handler
app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// Custom Error Handler
app.use((err, req, res, next) => {
  if (err.status) {
    const errBody = Object.assign({}, err, { message: err.message });
    res.status(err.status).json(errBody);
  } else {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});



if (require.main === module) {
// Connect to DB and Listen for incoming connections
  mongoose.connect(MONGODB_URI, { useNewUrlParser:true  })
    .catch(err => {
      console.error(`ERROR: ${err.message}`);
      console.error('\n === Did you remember to start `mongod`? === \n');
      console.error(err);
    });

  app.listen(PORT, function () {
    console.info(`Server listening on ${this.address().port}`);
  }).on('error', err => {
    console.error(err);
  });

}

module.exports = app; // Export for testing
