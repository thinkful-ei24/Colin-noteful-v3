const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');

const app = require('../server.js');
const { TEST_MONGODB_URI } = require('../config.js');
const Note = require('../models/note.js');
const seedNotes = require('../db/seed/notes.js');

const expect = chai.expect;
chai.use(chaiHttp);

describe('Notes API resource', function () {

  before(function () {
    return mongoose.connect(TEST_MONGODB_URI)
      .then(() => mongoose.connection.db.dropDatabase());
  });

  beforeEach(function () {
    return Note.insertMany(seedNotes);
  });

  afterEach(function () {
    return mongoose.connection.db.dropDatabase();
  });

  after(function () {
    return mongoose.disconnect();
  });


  /*=============== GET by ID Test =============== */
  describe('GET /api/notes/:id', function () {
    it('should return correct notes', function () {
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
          expect(res.body).to.have.keys('id', 'title', 'content', 'createdAt', 'updatedAt');

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
  //it('should respond with status 404 when ID does not exist', function () {
  //return chai.request(app)
  //  .get('/api/notes/stringof24c0')
  //  .then(res => {
  //    expect(res).to.have.status(404);
  //  });
  //});
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
    //it('should returns an empty array for invalid searchTerm ' function() {


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
          expect(res.body).to.have.keys('id', 'title', 'content', 'updatedAt', 'createdAt');
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
});
