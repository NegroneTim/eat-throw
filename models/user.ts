// models/user.js
import mongoose from 'mongoose';
import { customAlphabet } from 'nanoid';

const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const ID_LENGTH = 8;
const nanoid = customAlphabet(alphabet, ID_LENGTH);
const userSchema = new mongoose.Schema({
  uid: {
    type: String,
    require: true,
    unique: true,
    default: () => nanoid(),
  },
  user: {
    type: String,
    required: true,
  },
  unicode: {
    type: Number,
    required: true
  },
  dailyScore: {
    type: Number,
    default: 0
  },
  zoos: {
    type: Number,
    default: 0
  },
  ard: {
    type: Number,
    default: 10
  },
  stats: {
    hp: {
      type: Number,
      default: 1
    },
    earning: {
      type: Number,
      default: 1
    },
    maxCapacity: {
      type: Number,
      default: 1
    }
  }
}, {
  timestamps: true
});

export default mongoose.models.User || mongoose.model('User', userSchema);