'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');

const app = require('../server.js');
const { TEST_MONGODB_URI  } = require('../config.js');

const Folder = require('../models/folder.js');
const folders = require('../db/seed/folders.js');

const expect = chai.expect;
chai.use(chaiHttp);

describe('Noteful API - Folders', function () {

  before(() => {
    return mongoose.connect(TEST_MONGODB_URI, {useNewUrlParser: true})
      .then(() => mongoose.connection.db.dropDatabase());
  });

  beforeEach(function () {
    return Promise.all([
      Folder.insertMany(folders),
      Folder.createIndexes()
    ]);
  });

  afterEach(function () {
    return mongoose.connection.db.dropDatabase();
  });

  after(() => {
    mongoose.disconnect();
  });

  describe('sanity check', function() {
    it('true should true', function () {
      expect(true).to.equal(true);
    });
  });

  describe('GET ALL /api/folders', function () {

    it('should find all folders and validate that they have the correct fields', function () {

      const dbPromise = Folder.find().sort({ name: 'desc' });
      const apiPromise = chai.request(app).get('/api/folders');

      return Promise.all([dbPromise, apiPromise])
        .then(([db, res]) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.an('array');
          res.body.forEach((item, i) => {
            expect(item).to.be.an('object');
            expect(item).to.have.keys('name', 'id', 'createdAt', 'updatedAt');
            expect(item.name).to.equal(db[i].name);
            expect(item.id).to.equal(db[i].id);
            expect(new Date(item.createdAt)).to.eql(db[i].createdAt);
            expect(new Date(item.updatedAt)).to.eql(db[i].updatedAt);
          });
        });

    });

    it('should return th correct number of folders', function () {

      const dbPromise = Folder.find();
      const apiPromise = chai.request(app).get('/api/folders');

      return Promise.all([dbPromise, apiPromise])
        .then(([db, res]) => {
          expect(res).to.be.json;
          expect(res.body).to.be.an('array');
          expect(res).to.have.status(200);
          expect(res.body).to.have.length(db.length);
        });
    });
  });




  describe('GET by id /api/folders/:id', function () {

    it('should find a folder by id', function () {
      let folder;
      return Folder.findOne()
        .then(_folder => {
          folder = _folder;
          return chai.request(app)
            .get(`/api/folders/${folder.id}`)
            .then(res => {
              expect(res).to.be.json;
              expect(res).to.have.status(200);
              expect(res.body).to.be.an('object');
              expect(res.body).to.have.keys('name', 'createdAt', 'updatedAt', 'id');
              expect(res.body.name).to.be.equal(folder.name);
              expect(res.body.id).to.be.equal(folder.id);
              expect(new Date (res.body.createdAt)).to.be.eql(folder.createdAt);
              expect(new Date (res.body.updatedAt)).to.be.eql(folder.updatedAt);
            });
        });

    });


    it('should return a 400 error if given an invalid id', function () {
      return chai.request(app).get('/api/folders/INVALIDid')
        .then(res => {
          expect(res).to.have.status(400);
          expect(res.body.message).to.eq('this `id` is not valid');
        });
    });

    it('should return 404 if given a bad path', function () {
      return chai.request(app)
        .get('/api/folders/DOESNOTEXIST')
        .then(res => {
          expect(res).to.have.status(404);
        });
    });
  });

  describe('POST /api/folders', function () {

    it('should successfuly post a new item', function () {
      const newFolder = {name: 'some name'};
      let folder;
      return chai.request(app)
        .post('/api/folders')
        .send(newFolder)
        .then( res => {
          folder = res.body;
          expect(res).to.have.status(201);
          expect(res).to.be.json;
          expect(res.body).to.have.keys('name', 'updatedAt', 'createdAt', 'id');
          expect(res.body).to.be.an('object');
          return Folder.findById(folder.id);
        })
        .then( db => {
          expect(db).to.be.an('object');
          expect(db.id).to.equal(folder.id);
          expect(db.name).to.equal(folder.name);
          expect(db.createdAt).to.eql(new Date(folder.createdAt));
          expect(db.updatedAt).to.eql(new Date(folder.updatedAt));
        });
    });

    it('should return a status 400 if new folder does not have `name` field', function () {
      const newFolder = {undisclosed: 'undisclosed'};
      return chai.request(app)
        .post('/api/folders')
        .send(newFolder)
        .then(res => {
          expect(res).to.have.status(400);
          expect(res.body.message).to.equal('Missing `title` in request body');
        });
    });

    it('should return an error if the folder name already exists', function (){
      return Folder.findOne()
        .then(res => {
          const newFolder = {name: res.name};
          return chai.request(app)
            .post('/api/folders')
            .send(newFolder);
        })
        .then(res => {
          expect(res).to.have.status(400);
          expect(res.body.message).to.equal('The folder name already exists');
        });
    });
  });

  describe('PUT /api/folders/:id', function () {

    it('should update an already existing folder', function () {

      let updateItem = {name: 'updated name'};
      let id;


      return Folder.findOne()
        .then( res => {
          id = res.id;
          return chai.request(app)
            .put(`/api/folders/${res.id}`)
            .send(updateItem);
        })
        .then( () => {
          const dbPromise = Folder.findById(id);
          const apiPromise = chai.request(app).get(`/api/folders/${id}`);
          return Promise.all([
            dbPromise,
            apiPromise
          ]);
        })
        .then(([db, res]) => {
          expect(res.body.name).to.equal(db.name);
          expect(db.name).to.equal(updateItem.name);
          expect(res.body.id).to.equal(db.id);
          expect(res).to.have.status(200);
        });
    });

    it('should return an error if the folder name already exists', function () {
      return Folder.find().limit(2)
        .then(results => {
          const [item1, item2] = results;
          item1.name = item2.name;
          return chai.request(app)
            .put(`/api/folders/${item1.id}`)
            .send(item1);

        })
        .then(res => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('The folder name already exists');

        });
    });

    it('should return a 400 error for an invalid id', function () {
      const updateItem = { 'name': 'Blah'  };
      return chai.request(app)
        .put('/api/folders/NOT-A-VALID-ID')
        .send(updateItem)
        .then(res => {
          expect(res).to.have.status(400);
          expect(res.body.message).to.eq('The `id` is not valid');

        });
    });

    it('should respond with a 404 error if the id does not exist', function () {
      const updateItem = { 'name': 'Blah'  };
      return chai.request(app)
        .put('/api/folders/DOESNOTEXIST')
        .send(updateItem)
        .then(res => {
          expect(res).to.have.status(404);
        });
    });


  });

  describe('DELETE /api/folders/:id', function () {

    it('should delete a folder by id', function () {
      let folder;
      return Folder.findOne()
        .then(res => {
          folder = res;
          return chai.request(app)
            .delete(`/api/folders/${folder.id}`);
        })
        .then((res) => {
          expect(res).to.have.status(204);
          expect(res.body).to.be.empty;
          return Folder.countDocuments({_id: folder.id});
        })
        .then(count => {
          expect(count).to.equal(0);
        });
    });

  });
});
