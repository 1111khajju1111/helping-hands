const mongoose = require('mongoose');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/helpinghands');
    console.log('✅ MongoDB Connected Successfully');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error);
    process.exit(1);
  }
};

// Donor Schema
const donorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  bloodGroup: { type: String, required: true },
  city: { type: String, required: true, lowercase: true },
  address: String,
  available: { type: Boolean, default: true },
  registeredAt: { type: Date, default: Date.now }
});

// Create Model
const Donor = mongoose.model('Donor', donorSchema);

module.exports = { connectDB, Donor };