const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  fullname: {type: String},
  username: {type: String, required: true, unique: true},
  password: {type: String, required: true}
});

userSchema.methods.validatePassword = function (password) {
  return bcrypt.compare(password, this.password);
};

userSchema.statics.hashPassword = password => {
  return bcrypt.hash(password, 10);
};

userSchema.set('toObject', {
  virtuals: true,
  versionKey: false,
  transform: (doc, result) => {
    delete result._id;
    delete result.__v;
    delete result.password;
  }
});


module.exports = mongoose.model('User', userSchema);
