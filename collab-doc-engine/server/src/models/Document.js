const mongoose = require('mongoose');

const EditHistorySchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  username:  { type: String },
  userColor: { type: String },
  delta:     { type: Object },
  summary:   { type: mongoose.Schema.Types.Mixed },
  timestamp: { type: Number, index: true },
  version:   { type: Number },
}, { _id: false });

const ChatMessageSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  username:  { type: String },
  color:     { type: String },
  text:      { type: String, required: true },
  timestamp: { type: Number, default: Date.now },
}, { _id: false });

const CommentSchema = new mongoose.Schema({
  id:           { type: String },
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  username:     { type: String },
  color:        { type: String },
  text:         { type: String },
  selectedText: { type: String, default: '' },
  range:        { type: Object },
  resolved:     { type: Boolean, default: false },
  timestamp:    { type: Number, default: Date.now },
}, { _id: false });

const VersionSnapshotSchema = new mongoose.Schema({
  version:      { type: Number, required: true },
  content:      { type: Buffer },       // Huffman-compressed
  bitLength:    { type: Number },
  huffmanCodes: { type: String },
  deltaOps:     { type: Object },       // raw Quill Delta for quick restore
  timestamp:    { type: Number, index: true },
  savedBy:      { type: String },
  label:        { type: String, default: '' },
  changeDescription: { type: String, default: '' },
}, { _id: false });

const CollaboratorSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  username: { type: String },
  role:     { type: String, enum: ['owner', 'editor', 'viewer'], default: 'editor' },
  joinedAt: { type: Date, default: Date.now },
}, { _id: false });

const DocumentSchema = new mongoose.Schema({
  _id:     { type: String },
  title:   { type: String, default: 'Untitled Document' },

  // Quill Delta format: { ops: [...] }
  content: { type: Object, default: { ops: [] } },

  // Plain text cache for search
  plainText: { type: String, default: '' },

  version:  { type: Number, default: 0 },
  isPublic: { type: Boolean, default: false },
  publicToken: { type: String, default: null },  // for public share link
  locked:   { type: Boolean, default: false },   // lock mode
  tags:     [{ type: String }],

  collaborators: { type: [CollaboratorSchema], default: [] },
  editHistory:   { type: [EditHistorySchema], default: [] },
  snapshots:     { type: [VersionSnapshotSchema], default: [] },
  chat:          { type: [ChatMessageSchema], default: [] },
  comments:      { type: [CommentSchema], default: [] },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: false, versionKey: false });

// Indexes for fast queries
DocumentSchema.index({ 'collaborators.userId': 1 });
DocumentSchema.index({ updatedAt: -1 });
DocumentSchema.index({ title: 'text', plainText: 'text' });

DocumentSchema.pre('save', function (next) {
  if (this.editHistory.length > 2000) {
    this.editHistory = this.editHistory.slice(-2000);
  }
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Document', DocumentSchema);
