require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { connectDB, Donor } = require('./database');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());


const genAI = new GoogleGenerativeAI('AIzaSyCimXbmWFAK5i-caC3acur1qA0r5H0Fy1c'); 
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

// In-memory storage (replace with MongoDB/PostgreSQL in production)
let donors = [];
let emergencyRequests = [];

// Register Donor
// Register Donor
app.post('/api/register', async (req, res) => {
  try {
    const donor = new Donor(req.body);
    await donor.save();
    console.log('🩸 New Donor Registered:', donor.name);
    res.json({ success: true, message: 'Successfully registered as a blood donor!', donorId: donor._id });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Registration failed', error: error.message });
  }
});


// Search Donors
// Search Donors
app.get('/api/search', async (req, res) => {
  try {
    const { bloodGroup, city } = req.query;
    const donors = await Donor.find({ bloodGroup, city: city.toLowerCase(), available: true });
    res.json({ success: true, donors, count: donors.length });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Search failed', error: error.message });
  }
});


// Emergency Alert
app.post('/api/emergency', async (req, res) => {
    try {
        const emergency = {
            id: Date.now(),
            ...req.body,
            createdAt: new Date().toISOString(),
            status: 'active'
        };
        
        emergencyRequests.push(emergency);
        
        // Find matching donors
        const matchingDonors = donors.filter(donor => 
            donor.bloodGroup === emergency.bloodGroup && 
            donor.city.toLowerCase() === emergency.city.toLowerCase() &&
            donor.available === true
        );
        
        // Send notifications (implement with Twilio/Firebase for real notifications)
        matchingDonors.forEach(donor => {
            console.log(`📧 Notification sent to ${donor.name} (${donor.phone})`);
            console.log(`Emergency: ${emergency.patientName} needs ${emergency.bloodGroup} at ${emergency.hospital}`);
        });
        
        // Use Gemini AI to generate emergency message
        const prompt = `Generate a compassionate and urgent emergency alert message for blood donors. 
        Patient: ${emergency.patientName}
        Blood Group: ${emergency.bloodGroup}
        Hospital: ${emergency.hospital}
        Contact: ${emergency.contact}
        Keep it concise, emotional, and actionable.`;
        
        const result = await model.generateContent(prompt);
        const emergencyMessage = result.response.text();
        
        console.log('AI-generated emergency message:', emergencyMessage);
        
        res.json({
            success: true,
            message: 'Emergency alert sent successfully',
            notifiedCount: matchingDonors.length,
            emergencyId: emergency.id,
            aiMessage: emergencyMessage
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Emergency alert failed',
            error: error.message
        });
    }
});

// AI Help - Gemini Integration
app.post('/api/ai-help', async (req, res) => {
    try {
        const { question } = req.body;
        
        const prompt = `You are a helpful blood donation assistant. Answer this question about blood donation accurately and concisely:
        
        Question: ${question}
        
        Provide factual, medical-accurate information. Keep the answer under 150 words.`;
        
        const result = await model.generateContent(prompt);
        const answer = result.response.text();
        
        console.log('AI Question:', question);
        console.log('AI Answer:', answer);
        
        res.json({
            success: true,
            question: question,
            answer: answer
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'AI service unavailable',
            error: error.message
        });
    }
});

// Get All Donors (Admin)
app.get('/api/donors', (req, res) => {
    res.json({
        success: true,
        donors: donors,
        count: donors.length
    });
});

// Get All Emergency Requests (Admin)
app.get('/api/emergencies', (req, res) => {
    res.json({
        success: true,
        emergencies: emergencyRequests,
        count: emergencyRequests.length
    });
});

// Update Donor Availability
app.patch('/api/donor/:id/availability', (req, res) => {
    try {
        const { id } = req.params;
        const { available } = req.body;
        
        const donor = donors.find(d => d.id === parseInt(id));
        
        if (!donor) {
            return res.status(404).json({
                success: false,
                message: 'Donor not found'
            });
        }
        
        donor.available = available;
        
        res.json({
            success: true,
            message: 'Availability updated',
            donor: donor
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Update failed',
            error: error.message
        });
    }
});

// Health Check
app.get('/health', (req, res) => {
    res.json({
        status: 'running',
        timestamp: new Date().toISOString(),
        donors: donors.length,
        emergencies: emergencyRequests.length
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`🩸 Helping Hands Server running on http://localhost:${PORT}`);
    console.log('📱 Ready to save lives!');
});
// database.js - MongoDB Configuration
const mongoose = require('mongoose');

// Connect to MongoDB and start the server
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🩸 Helping Hands Server running on http://localhost:${PORT}`);
      console.log('📱 Ready to save lives!');
    });
  })
  .catch(err => {
    console.error('❌ Failed to start server:', err);
  });


// Donor Schema
const donorSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    phone: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    bloodGroup: {
        type: String,
        required: true,
        enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
    },
    city: {
        type: String,
        required: true,
        lowercase: true
    },
    address: {
        type: String,
        required: true
    },
    available: {
        type: Boolean,
        default: true
    },
    lastDonation: {
        type: Date
    },
    donationCount: {
        type: Number,
        default: 0
    },
    registeredAt: {
        type: Date,
        default: Date.now
    }
});

// Add indexes for faster searches
donorSchema.index({ bloodGroup: 1, city: 1, available: 1 });

// Emergency Request Schema
const emergencySchema = new mongoose.Schema({
    patientName: {
        type: String,
        required: true
    },
    bloodGroup: {
        type: String,
        required: true,
        enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
    },
    hospital: {
        type: String,
        required: true
    },
    city: {
        type: String,
        required: true,
        lowercase: true
    },
    contact: {
        type: String,
        required: true
    },
    details: String,
    status: {
        type: String,
        enum: ['active', 'fulfilled', 'cancelled'],
        default: 'active'
    },
    notifiedDonors: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Donor'
    }],
    respondedDonors: [{
        donor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Donor'
        },
        respondedAt: Date,
        response: String
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    fulfilledAt: Date
});

emergencySchema.index({ bloodGroup: 1, city: 1, status: 1 });

// Notification Schema
const notificationSchema = new mongoose.Schema({
    donor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Donor',
        required: true
    },
    emergency: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Emergency'
    },
    type: {
        type: String,
        enum: ['emergency', 'reminder', 'thank_you', 'update'],
        required: true
    },
    message: {
        type: String,
        required: true
    },
    read: {
        type: Boolean,
        default: false
    },
    sentAt: {
        type: Date,
        default: Date.now
    }
});

// Create Models
const Emergency = mongoose.model('Emergency', emergencySchema);
const Notification = mongoose.model('Notification', notificationSchema);

// Export
module.exports = {
    connectDB,
    Donor,
    Emergency,
    Notification
};
