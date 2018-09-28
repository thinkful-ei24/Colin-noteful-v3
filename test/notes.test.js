'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const app = require('../server.js');
const { TEST_MONGODB_URI, JWT_SECRET } = require('../config.js');

const Note = require('../models/note.js');
const User = require('../models/user.js');
const Folder = require('../models/folder.js');
const Tag = require('../models/tags.js');

//const seedNotes = require('../db/seed/notes.js');
//const folders = require('../db/seed/folders.js');
//const tags = require('../db/seed/folders.js');
const {notes, folders, tags, users} = require('../db/data.js');

const expect = chai.expect;
chai.use(chaiHttp);

describe('Notes API resource', function () {

  let token;
  let user;

  before(function () {
    return mongoose.connect(TEST_MONGODB_URI)
      .then(() => mongoose.connection.db.dropDatabase());
  });

  beforeEach(function () {
    return Promise.all([
      User.insertMany(users),
      Note.insertMany(notes),
      Folder.insertMany(folders),
      Folder.createIndexes(),
      Tag.insertMany(tags),
      Tag.createIndexes()
    ])
      .then(([users]) => {
        user = users[0];
        token = jwt.sign({ user }, JWT_SECRET, { subject: user.username });
      });

  });

  afterEach(function () {
    return mongoose.connection.db.dropDatabase();
  });

  after(function () {
    return mongoose.disconnect();
  });


  /*=============== GET by ID Test =============== */
  describe('GET /api/notes/:id', function () {

    it('should return correct fields in notes', function () {
      let note;
      return Note.findOne({ userId: user.id })
        .then(foundNote => {
          note = foundNote;
          return chai.request(app)
            .get(`/api/notes/${note.id}`)
            .set('Authorization', `Bearer ${token}`);
        })
        .then((res) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.an('object');
          expect(res.body).to.have.keys('id', 'userId', 'title', 'content', 'createdAt', 'updatedAt', 'tags');

          expect(res.body.id).to.equal(note.id);
          expect(res.body.title).to.equal(note.title);
          expect(new Date(res.body.createdAt)).to.eql(note.createdAt);
          expect(new Date(res.body.updatedAt)).to.eql(note.updatedAt);
        });
    });

    it('should respond with status 400 when ID is not valid', function () {

      return chai.request(app)
        .get('/api/notes/itsanID')
        .set('Authorization', `Bearer ${token}`)
        .then(res => {
          expect(res).to.have.status(400);
        });
    });
  });

  /* ==================  GET all ============= */
  describe('GET /api/notes', function () {
    it('should return the correct number of Notes', function () {
      return Promise.all([
        Note.find({userId: user.id}),
        chai.request(app)
          .get('/api/notes')
          .set('Authorization', `Bearer ${token}`)
      ])
        .then(([data, res]) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.an('array');
          expect(res.body).to.have.length(data.length);
        });
    });

    it('should return a list of notes where the notes have the correct fields', function () {
      return Promise.all([
        Note.find({userId: user.id}),
        chai.request(app)
          .get('/api/notes')
          .set('Authorization', `Bearer ${token}`)
      ])
        .then(([data, res]) => {
          expect(res.body).to.be.an('array');
          expect(res).to.be.json;
          expect(res).to.have.status(200);
          expect(res.body).to.have.length(data.length);
          res.body.forEach(function (item, i) {
            expect(item).to.be.a('object');
            // Note: folderId and content are optional
            expect(item).to.include.all.keys('id', 'userId', 'title', 'createdAt', 'updatedAt', 'tags');
            expect(item.id).to.equal(data[i].id);
            expect(item.title).to.equal(data[i].title);
            expect(item.content).to.equal(data[i].content);
            expect(new Date(item.createdAt)).to.eql(data[i].createdAt);
            expect(new Date(item.updatedAt)).to.eql(data[i].updatedAt);
          });
        });
    });
    //
    it('should return the correct search result for a searchTerm query', function () {

      const searchTerm = 'cats';
      const regex = new RegExp(searchTerm, 'gi');

      const dbPromise = Note.find({$and: [{userId: user.id}, {$or: [{'title': regex}, {'content': regex}]}]});
      const apiPromise = chai.request(app)
        .get(`/api/notes?searchTerm=${searchTerm}`)
        .set('Authorization', `Bearer ${token}`);

      return Promise.all([dbPromise, apiPromise])
        .then(([db, res]) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.an('array');
          expect(res.body).to.have.length(db.length);
          res.body.forEach((item, i) => {
            expect(item).to.be.an('object');
            expect(item).to.include.keys('title', 'content', 'tags', 'createdAt', 'updatedAt');
            expect(item.id).to.equal(db[i].id);
            expect(item.title).to.equal(db[i].title);
            expect(item.content).to.equal(db[i].content);
            expect(new Date (item.createdAt)).to.eql(db[i].createdAt);
            expect(new Date (item.updatedAt)).to.eql(db[i].updatedAt);
          });
        });
    });
    //
    it('should return correct search results for a folderId query', function () {

      let folder;
      return Folder.findOne( {userId: user.id} )
        .then(data => {
          folder = data;
          return Promise.all([
            Note.find({ folderId: folder.id, userId: user.id }),
            chai.request(app)
              .get(`/api/notes?folderId=${folder.id}`)
              .set('Authorization', `Bearer ${token}`)
          ]);
        })
        .then(([data, res]) => {
          expect(res).to.have.status(200);
          expect(res.body).to.be.an('array');
          expect(res.body).to.have.length(data.length);
          expect(res).to.be.json;
        });
    });

  });

  /* =================  POST TESTS ================ */
  describe('POST /api/notes', function() {

    it('should create a new note and return a new item when given valid data', function () {
      const newNote = {
        'title': 'Testing a New Note',
        'content': 'test the new note with mocha/chai'
      };
      let res;

      return chai.request(app)
        .post('/api/notes')
        .set('Authorization', `Bearer ${token}`)
        .send(newNote)
        .then(function (_res) {
          res = _res;
          expect(res).to.have.status(201);
          expect(res).to.have.header('location');
          expect(res).to.be.json;
          expect(res.body).to.be.an('object');
          expect(res.body).to.have.keys('id', 'userId', 'title', 'content', 'updatedAt', 'createdAt', 'tags');
          return Note.findById(res.body.id);
        })
        .then(function(note) {
          expect(res.body.id).to.equal(note.id);
          expect(res.body.title).to.equal(note.title);
          expect(res.body.content).to.equal(note.content);
          expect(new Date(res.body.updatedAt)).to.eql(note.updatedAt);
          expect(new Date(res.body.createdAt)).to.eql(note.updatedAt);
        });
    });

    it('should return a 400 error if given a post without a title', function () {
      const newNote = {'content': 'content without a title'};
      let res;

      return chai.request(app)
        .post('/api/notes')
        .set('Authorization', `Bearer ${token}`)
        .send(newNote)
        .then(function (_res) {
          res = _res;
          expect(res).to.have.status(400);
          expect(res).to.be.json;
        });
    });
  });

  describe('PUT /api/notes', function () {
    it('updates an item in the database', function () {

      const updateNote = {title: 'I\'m an updated note', content: 'look how updated I am'};
      let res;
      let og_id;

      return Note
        .findOne({userId: user.id})
        .then(foundNote => {
          og_id = foundNote.id;
          return chai.request(app)
            .put(`/api/notes/${og_id}`)
            .set('Authorization', `Bearer ${token}`)
            .send(updateNote);
        })
        .then(_res => {
          res = _res;
          expect(res).to.be.json;
          expect(res).to.have.status(201);
          expect(res.body).to.be.an('object');
          expect(res.body).to.have.keys('id', 'title', 'userId', 'content', 'createdAt', 'updatedAt', 'tags');
          expect(res.body.title).to.equal(updateNote.title);
          expect(res.body.content).to.equal(updateNote.content);
          return Note.findById(res.body.id);
        })
        .then(dbNote => {
          expect(res.body.id).to.equal(dbNote.id);
          expect(dbNote.id).to.equal(og_id);
          expect(res.body.title).to.equal(dbNote.title);
          expect(dbNote.title).to.equal(updateNote.title);
          expect(res.body.content).to.equal(dbNote.content);
          expect(dbNote.content).to.equal(updateNote.content);
          expect(new Date(res.body.updatedAt)).to.eql(dbNote.updatedAt);
          expect(new Date(res.body.updatedAt)).to.eql(dbNote.updatedAt);
        });
    });

    it('status 404 when an item is updated with invalid data', function () {

      const updateNote = {'title': 'sdfsdfsdf', 'content': 'content '};
      let res;

      return chai.request(app)
        .put('/api/notes/BADPATH')
        .set('Authorization', `Bearer ${token}`)
        .send(updateNote)
        .then(function (_res) {
          res = _res;
          expect(res).to.have.status(404);
        });
    });

    //    it('should return a status 400 and an error when `id` is not valid', function() {
    //
    //      const updateNote = {'content': 'good content'};
    //
    //      let res;
    //      return Note.findOne({userId: user.id})
    //        .then(_res => {
    //          res = _res;
    //          return chai.request(app)
    //            .put(`/api/notes/${res.id}`)
    //            .set('Authorization', `Bearer ${token}`)
    //            .send(updateNote);
    //        })
    //        .then(data => {
    //          expect(data).to.have.status(400);
    //          expect(data).to.be.json;
    //          expect(data.body).to.be.an('object');
    //          expect(data.body.message).to.equal('Missing `title` in request body');
    //        });
    //
    //    });
  });

  describe('DELETE an item', function () {
    it('successfully removes an item from the database', function () {
      return Note.findOne({userId: user.id})
        .then(res => {
          return chai.request(app)
            .delete(`/api/notes/${res.id}`)
            .set('Authorization', `Bearer ${token}`);
        })
        .then((res) => {
          expect(res).to.have.status(204);
        });
    });
  });
});
