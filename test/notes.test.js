'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');

const app = require('../server.js');
const { TEST_MONGODB_URI } = require('../config.js');

const Note = require('../models/note.js');
const Folder = require('../models/folder.js');
const Tag = require('../models/tags.js');

const seedNotes = require('../db/seed/notes.js');
const folders = require('../db/seed/folders.js');
const tags = require('../db/seed/folders.js');

const expect = chai.expect;
chai.use(chaiHttp);

describe('Notes API resource', function () {

  before(function () {
    return mongoose.connect(TEST_MONGODB_URI)
      .then(() => mongoose.connection.db.dropDatabase());
  });

  beforeEach(function () {
    return Promise.all([
      Note.insertMany(seedNotes),
      Folder.insertMany(folders),
      Folder.createIndexes(),
      Tag.insertMany(tags),
      Tag.createIndexes()
    ]);

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
      return Note.findOne()
        .then(foundNote => {
          note = foundNote;
          return chai.request(app).get(`/api/notes/${note.id}`);
        })
        .then((res) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.an('object');
          expect(res.body).to.have.keys('id', 'title', 'content', 'createdAt', 'updatedAt', 'tags', 'folderId');

          expect(res.body.id).to.equal(note.id);
          expect(res.body.title).to.equal(note.title);
          expect(new Date(res.body.createdAt)).to.eql(note.createdAt);
          expect(new Date(res.body.updatedAt)).to.eql(note.updatedAt);
        });
    });

    it('should respond with status 400 when ID is not valid', function () {

      return chai.request(app)
        .get('/api/notes/itsanID')
        .then(res => {
          expect(res).to.have.status(400);
        });
    });
  });

  /* ==================  GET all ============= */
  describe('GET /api/notes', function () {
    it('should return the correct number of Notes', function () {
      return Promise.all([
        Note.find(),
        chai.request(app).get('/api/notes')
      ])
        .then(([data, res]) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.an('array');
          expect(res.body).to.have.length(data.length);
        });
    });
    //
    // it('should return a list of notes where the notes have the correct fields' ...........)
    //
    // it('should return the correct search result for a searchTerm query')
    //
    // it('should return correct search results for a folderId query',)
    //
    //


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
        .send(newNote)
        .then(function (_res) {
          res = _res;
          expect(res).to.have.status(201);
          expect(res).to.have.header('location');
          expect(res).to.be.json;
          expect(res.body).to.be.an('object');
          expect(res.body).to.have.keys('id', 'title', 'content', 'updatedAt', 'createdAt', 'tags');
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
        .findOne()
        .then(foundNote => {
          og_id = foundNote.id;
          return chai.request(app)
            .put(`/api/notes/${og_id}`)
            .send(updateNote);
        })
        .then(_res => {
          res = _res;
          expect(res).to.be.json;
          expect(res).to.have.status(200);
          expect(res.body).to.be.an('object');
          expect(res.body).to.have.keys('id', 'title', 'content', 'createdAt', 'updatedAt', 'folderId', 'tags');
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

      const updateNote = {'title': 'sdfsdfsdf', 'content': 'content without a title'};
      let res;

      return chai.request(app)
        .put('/api/notes/BADPATH')
        .send(updateNote)
        .then(function (_res) {
          res = _res;
          expect(res).to.have.status(404);
        });
    });

    it('should return a status 400 and an error when `id` is not valid', function() {

      const updateNote = {'content': 'good content' };

      let res;
      return Note.findOne()
        .then(_res => {
          res = _res;
          return chai.request(app)
            .put(`/api/notes/${res.id}`)
            .send(updateNote);
        })
        .then(data => {
          expect(data).to.have.status(400);
          expect(data).to.be.json;
          expect(data.body).to.be.an('object');
          expect(data.body.message).to.equal('Missing `title` in request body');
        });

    });
  });

  describe('DELETE an item', function () {
    it('successfully removes an item from the database', function () {
      return Note.findOne()
        .then(res => {
          return chai.request(app)
            .delete(`/api/notes/${res.id}`);
        })
        .then((res) => {
          expect(res).to.have.status(204);
        });
    });
  });
});
