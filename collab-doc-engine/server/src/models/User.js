const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, minlength: 6 },
  avatar:   { type: String, default: '' },
  color:    { type: String, default: '#3498db' }, // cursor color
  createdAt:{ type: Date, default: Date.now },
}, { versionKey: false });

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

UserSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

UserSchema.methods.toPublic = function () {
  return { _id: this._id, username: this.username, email: this.email, color: this.color, avatar: this.avatar };
};

module.exports = mongoose.model('User', UserSchema);
