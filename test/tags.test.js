'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const jwt = require('jsonwebtoken');

const mongoose = require('mongoose');

const app = require('../server');
const { TEST_MONGODB_URI, JWT_SECRET  } = require('../config');

const User = require('../models/user.js');
const Tag = require('../models/tags');
const {tags, users} = require('../db/data.js');

const expect = chai.expect;
chai.use(chaiHttp);

describe('Noteful API - Tags', function () {

  let token;
  let user;

  before(function () {
    return mongoose.connect(TEST_MONGODB_URI, { useNewUrlParser: true  })
      .then(() => mongoose.connection.db.dropDatabase());
  });

  beforeEach(function () {
    return Promise.all([
      User.insertMany(users),
      Tag.insertMany(tags),
      Tag.createIndexes()
    ])
      .then(([users]) => {
        user = users[0];
        token = jwt.sign({ user }, JWT_SECRET, { subject: user.username  });
      });
  });

  afterEach(function () {
    return mongoose.connection.db.dropDatabase();

  });

  after(function () {
    return mongoose.disconnect();
  });

  describe('GET /api/tags', function () {

    it('should return the correct number of tags', function () {
      return Promise.all([
        Tag.find({userId: user.id}),
        chai.request(app)
          .get('/api/tags')
          .set('Authorization', `Bearer ${token}`)
      ])
        .then(([data, res]) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('array');
          expect(res.body).to.have.length(data.length);
        });
    });

    it('should return a list with the correct fields and values', function () {
      return Promise.all([
        Tag.find({userId: user.id}).sort('name'),
        chai.request(app)
          .get('/api/tags')
          .set('Authorization', `Bearer ${token}`)
      ])
        .then(([data, res]) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('array');
          expect(res.body).to.have.length(data.length);
          res.body.forEach(function (item, i) {
            //  expect(item).to.be.a('object');
            //  expect(item).to.have.all.keys('id', 'name', 'userId', 'createdAt', 'updatedAt');
            //  expect(item.id).to.equal(data[i].id);
            //  expect(item.name).to.equal(data[i].name);
            //  expect(new Date(item.createdAt)).to.deep.equal(data[i].createdAt);
            //  expect(new Date(item.updatedAt)).to.deep.equal(data[i].updatedAt);
          });
        });
    });
  });

  describe('GET /api/tags/:id', function () {

    it('should return correct tags', function () {
      let data;
      return Tag.findOne({userId: user.id})
        .then(_data => {
          data = _data;
          return chai.request(app)
            .get(`/api/tags/${data.id}`)
            .set('Authorization', `Bearer ${token}`);
        })
        .then((res) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.an('object');
          expect(res.body).to.have.all.keys('id', 'name', 'createdAt', 'updatedAt', 'userId');
          expect(res.body.id).to.equal(data.id);
          expect(res.body.name).to.equal(data.name);
          expect(new Date(res.body.createdAt)).to.deep.equal(data.createdAt);
          expect(new Date(res.body.updatedAt)).to.deep.equal(data.updatedAt);
        });

    });

    it('should respond with a 400 for an invalid id', function () {
      return chai.request(app)
        .get('/api/tags/NOT-A-VALID-ID')
        .set('Authorization', `Bearer ${token}`)
        .then(res => {
          expect(res).to.have.status(400);
          expect(res.body.message).to.eq('this `id` is not valid');
        });
    });

    it('should respond with a 404 for an id that does not exist', function () {
    // The string "DOESNOTEXIST" is 12 bytes which is a valid Mongo ObjectId
      return chai.request(app)
        .get('/api/tags/DOESNOTEXIST')
        .set('Authorization', `Bearer ${token}`)
        .then(res => {
          expect(res).to.have.status(404);
        });
    });
  });


  describe('POST /api/tags', function () {

    it('should create and return a new item when provided valid data', function () {
      const newItem = { 'name': 'newTag'  };
      let body;
      return chai.request(app)
        .post('/api/tags')
        .set('Authorization', `Bearer ${token}`)
        .send(newItem)
        .then(function (res) {
          body = res.body;
          expect(res).to.have.status(201);
          expect(res).to.have.header('location');
          expect(res).to.be.json;
          expect(body).to.be.a('object');
          expect(body).to.have.all.keys('id', 'name', 'createdAt', 'updatedAt', 'userId');
          return Tag.findById(body.id);
        })
        .then(data => {
          expect(body.id).to.equal(data.id);
          expect(body.name).to.equal(data.name);
          expect(new Date(body.createdAt)).to.deep.equal(data.createdAt);
          expect(new Date(body.updatedAt)).to.deep.equal(data.updatedAt);
        });
    });

    it('should return an error when missing "name" field', function () {
      const newItem = { 'foo': 'bar'  };

      return chai.request(app)
        .post('/api/tags')
        .set('Authorization', `Bearer ${token}`)
        .send(newItem)
        .then(res => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('Missing `title` in request body');
        });
    });

    it('should return an error when given a duplicate name', function () {
      return Tag.findOne()
        .then(data => {
          const newItem = { 'name': data.name  };
          return chai.request(app)
            .post('/api/tags')
            .set('Authorization', `Bearer ${token}`)
            .send(newItem);
        })
        .then(res => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('The Tag name already exists. We dont need another one.  \nLike... seriously just use the one thats already there');
        });
    });
  });

  describe('PUT /api/tags/:id', function () {

    it('should update the tag', function () {
      const updateItem = { 'name': 'Updated Name'  };
      let data;
      return Tag.findOne()
        .then(_data => {
          data = _data;
          return chai.request(app)
            .put(`/api/tags/${data.id}`)
            .set('Authorization', `Bearer ${token}`)
            .send(updateItem);
        })
        .then(function (res) {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body).to.have.all.keys('id', 'name', 'createdAt', 'updatedAt', 'userId');
          expect(res.body.id).to.equal(data.id);
          expect(res.body.name).to.equal(updateItem.name);
          expect(new Date(res.body.createdAt)).to.deep.equal(data.createdAt);
          expect(new Date(res.body.updatedAt)).to.greaterThan(data.updatedAt);
        });
    });

    it('should respond with a 400 for an invalid id', function () {
      const updateItem = { 'name': 'Blah'  };

      return chai.request(app)
        .put('/api/tags/NOT-A-VALID-ID')
        .set('Authorization', `Bearer ${token}`)
        .send(updateItem)
        .then(res => {
          expect(res).to.have.status(400);
          expect(res.body.message).to.eq('this `id` is not valid');
        });
    });

    it('should respond with a 404 for an id that does not exist', function () {
      const updateItem = { 'name': 'Blah'  };
      return chai.request(app)
        .put('/api/tags/DOESNOTEXIST')
        .set('Authorization', `Bearer ${token}`)
        .send(updateItem)
        .then(res => {
          expect(res).to.have.status(404);
        });
    });

    it('should return an error when missing "name" field', function () {
      const updateItem = {};
      let data;
      return Tag.findOne({userId: user.id})
        .then(_data => {
          data = _data;
          return chai.request(app)
            .put(`/api/tags/${data.id}`)
            .set('Authorization', `Bearer ${token}`)
            .send(updateItem);
        })
        .then(res => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('Missing `title` in the request body');
        });
    });

    it('should return an error when given a duplicate name', function () {
      return Tag.find({userId: user.id}).limit(2)
        .then(results => {
          const [item1, item2] = results;
          item1.name = item2.name;
          return chai.request(app)
            .put(`/api/tags/${item1.id}`)
            .set('Authorization', `Bearer ${token}`)
            .send(item1);
        })
        .then(res => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('The tag name already exists');
        });
    });

  });

  describe('DELETE /api/tags/:id', function () {

    it('should delete an existing document and respond with 204', function () {
      let data;
      return Tag.findOne({userId: user.id})
        .then(_data => {
          data = _data;
          return chai.request(app)
            .delete(`/api/tags/${data.id}`)
            .set('Authorization', `Bearer ${token}`);
        })
        .then(function (res) {
          expect(res).to.have.status(204);
          expect(res.body).to.be.empty;
          return Tag.countDocuments({ _id: data.id  });
        })
        .then(count => {
          expect(count).to.equal(0);
        });
    });
  });
});
