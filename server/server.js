import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/roomivo')
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err));

const userSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: { type: String, unique: true, required: true },
  passwordHash: String,
  role: { type: String, enum: ['tenant', 'landlord', 'admin'], default: 'tenant' },
  verified: { type: Boolean, default: false },
  profile: {
    budgetmin: Number,
    budgetmax: Number,
    preferredlocations: [String],
    amenitiesrequired: [String]
  },
  createdAt: { type: Date, default: Date.now }
});

const propertySchema = new mongoose.Schema({
  landlordId: mongoose.Schema.Types.ObjectId,
  title: String,
  description: String,
  address: String,
  city: String,
  country: String,
  lat: Number,
  lng: Number,
  propertyType: String,
  rooms: Number,
  bathrooms: Number,
  price: Number,
  amenities: [String],
  verified: { type: Boolean, default: true },
  legalComplianceScore: { type: Number, default: 95 },
  createdAt: { type: Date, default: Date.now }
});

const applicationSchema = new mongoose.Schema({
  tenantId: mongoose.Schema.Types.ObjectId,
  propertyId: mongoose.Schema.Types.ObjectId,
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  applicationData: {
    moveInDate: String,
    employmentStatus: String,
    annualIncome: Number,
    references: String,
    petFriendly: Boolean,
    notes: String
  },
  submittedAt: { type: Date, default: Date.now },
  reviewedAt: Date
});

const messageSchema = new mongoose.Schema({
  senderId: mongoose.Schema.Types.ObjectId,
  recipientId: mongoose.Schema.Types.ObjectId,
  applicationId: mongoose.Schema.Types.ObjectId,
  text: String,
  timestamp: { type: Date, default: Date.now },
  read: { type: Boolean, default: false }
});

const contractSchema = new mongoose.Schema({
  applicationId: mongoose.Schema.Types.ObjectId,
  tenantId: mongoose.Schema.Types.ObjectId,
  landlordId: mongoose.Schema.Types.ObjectId,
  contractText: String,
  complianceScore: { type: Number, default: 95 },
  signedByTenant: { type: Boolean, default: false },
  signedByLandlord: { type: Boolean, default: false },
  tenantSignedAt: Date,
  landlordSignedAt: Date,
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Property = mongoose.model('Property', propertySchema);
const Application = mongoose.model('Application', applicationSchema);
const Message = mongoose.model('Message', messageSchema);
const Contract = mongoose.model('Contract', contractSchema);

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'No token provided' });

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

app.post('/api/auth/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = new User({
      firstName,
      lastName,
      email,
      passwordHash,
      role: role || 'tenant'
    });

    await user.save();

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/properties', async (req, res) => {
  try {
    const properties = await Property.find();
    res.json(properties);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/properties/:id', async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }
    res.json(property);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/properties', authenticateToken, async (req, res) => {
  try {
    const { title, description, address, city, country, lat, lng, propertyType, rooms, bathrooms, price, amenities } = req.body;

    const property = new Property({
      landlordId: req.user.id,
      title,
      description,
      address,
      city,
      country,
      lat,
      lng,
      propertyType,
      rooms,
      bathrooms,
      price,
      amenities,
      verified: true,
      legalComplianceScore: 95
    });

    await property.save();
    res.status(201).json(property);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/properties/:id', authenticateToken, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    if (property.landlordId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    Object.assign(property, req.body);
    await property.save();
    res.json(property);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/properties/:id', authenticateToken, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    if (property.landlordId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await Property.findByIdAndDelete(req.params.id);
    res.json({ message: 'Property deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const calculateMatchScore = (tenant, property) => {
  let score = 0;

  if (tenant.profile && tenant.profile.budgetmin && tenant.profile.budgetmax) {
    if (property.price >= tenant.profile.budgetmin && property.price <= tenant.profile.budgetmax) {
      score += 30;
    } else if (property.price <= tenant.profile.budgetmax * 1.1) {
      score += 15;
    }
  }

  if (tenant.profile && tenant.profile.preferredlocations && tenant.profile.preferredlocations.length > 0) {
    if (tenant.profile.preferredlocations.includes(property.city)) {
      score += 25;
    }
  }

  if (tenant.profile && tenant.profile.amenitiesrequired && tenant.profile.amenitiesrequired.length > 0) {
    const matchedAmenities = tenant.profile.amenitiesrequired.filter(a => property.amenities.includes(a));
    score += (matchedAmenities.length / tenant.profile.amenitiesrequired.length) * 25;
  }

  if (property.legalComplianceScore >= 90) {
    score += 20;
  } else if (property.legalComplianceScore >= 80) {
    score += 10;
  }

  return Math.round(score);
};

app.get('/api/matches', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const properties = await Property.find({ verified: true });

    const matches = properties
      .map(prop => ({
        propertyId: prop._id,
        title: prop.title,
        price: prop.price,
        city: prop.city,
        amenities: prop.amenities,
        matchScore: calculateMatchScore(user, prop)
      }))
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 5);

    res.json(matches);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/applications', authenticateToken, async (req, res) => {
  try {
    const { propertyId, applicationData } = req.body;

    const application = new Application({
      tenantId: req.user.id,
      propertyId,
      applicationData,
      status: 'pending'
    });

    await application.save();
    res.status(201).json(application);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/applications', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    let applications;

    if (user.role === 'tenant') {
      applications = await Application.find({ tenantId: req.user.id });
    } else if (user.role === 'landlord') {
      const properties = await Property.find({ landlordId: req.user.id });
      const propertyIds = properties.map(p => p._id);
      applications = await Application.find({ propertyId: { $in: propertyIds } });
    }

    res.json(applications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/applications/:id', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;

    const application = await Application.findById(req.params.id);
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    application.status = status;
    application.reviewedAt = new Date();
    await application.save();

    res.json(application);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/contracts', authenticateToken, async (req, res) => {
  try {
    const { applicationId, tenantId, landlordId, contractText } = req.body;

    const contract = new Contract({
      applicationId,
      tenantId,
      landlordId,
      contractText,
      complianceScore: 95
    });

    await contract.save();
    res.status(201).json(contract);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/contracts/:applicationId', authenticateToken, async (req, res) => {
  try {
    const contract = await Contract.findOne({ applicationId: req.params.applicationId });
    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }
    res.json(contract);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/contracts/:id/sign', authenticateToken, async (req, res) => {
  try {
    const { isTenant } = req.body;

    const contract = await Contract.findById(req.params.id);
    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    if (isTenant) {
      contract.signedByTenant = true;
      contract.tenantSignedAt = new Date();
    } else {
      contract.signedByLandlord = true;
      contract.landlordSignedAt = new Date();
    }

    await contract.save();
    res.json(contract);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

io.on('connection', (socket) => {
  console.log('✅ User connected:', socket.id);

  socket.on('join-application', (applicationId) => {
    socket.join(`app-${applicationId}`);
    console.log(`User joined room: app-${applicationId}`);
  });

  socket.on('send-message', async (messageData) => {
    try {
      const message = new Message({
        senderId: messageData.senderId,
        recipientId: messageData.recipientId,
        applicationId: messageData.applicationId,
        text: messageData.text,
        timestamp: new Date()
      });

      await message.save();

      io.to(`app-${messageData.applicationId}`).emit('receive-message', {
        id: message._id,
        senderId: message.senderId,
        text: message.text,
        timestamp: message.timestamp
      });
    } catch (error) {
      console.error('Message error:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 5001;
httpServer.listen(PORT, () => {
  console.log(`🚀 Roomivo Backend running on http://localhost:${PORT}`);
  console.log(`✅ Socket.io running on http://localhost:${PORT}`);
});