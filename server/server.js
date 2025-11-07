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
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// ============================================
// MONGODB CONNECTION - FIXED
// ============================================
console.log('🔍 Environment Check:');
console.log('MONGODB_URI exists:', !!process.env.MONGODB_URI);
console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
console.log('CORS_ORIGIN:', process.env.CORS_ORIGIN);
console.log('NODE_ENV:', process.env.NODE_ENV);

if (!process.env.MONGODB_URI) {
  console.error('❌ CRITICAL ERROR: MONGODB_URI is not defined!');
  console.error('Please add MONGODB_URI to your environment variables');
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  console.error('❌ CRITICAL ERROR: JWT_SECRET is not defined!');
  process.exit(1);
}

mongoose.connect(process.env.MONGODB_URI, {
  retryWrites: true,
  w: 'majority',
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 10000
})
  .then(() => {
    console.log('✅ MongoDB Connected Successfully!');
    console.log('📊 Database:', process.env.MONGODB_URI.split('/').pop().split('?')[0]);
  })
  .catch(err => {
    console.error('❌ MongoDB Connection Error:', err.message);
    console.error('Connection String (first 50 chars):', process.env.MONGODB_URI.substring(0, 50) + '...');
    process.exit(1);
  });

// ============================================
// SCHEMAS
// ============================================
const userSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: { type: String, unique: true },
  passwordHash: String,
  role: { type: String, default: 'tenant' }
});

const propertySchema = new mongoose.Schema({
  landlordId: String,
  title: String,
  description: String,
  city: String,
  price: Number,
  rooms: Number,
  amenities: [String],
  createdAt: { type: Date, default: Date.now }
});

const applicationSchema = new mongoose.Schema({
  tenantId: String,
  propertyId: String,
  status: { type: String, default: 'pending' },
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

const contractSchema = new mongoose.Schema({
  applicationId: String,
  tenantId: String,
  landlordId: String,
  contractText: String,
  complianceScore: Number,
  signedByTenant: { type: Boolean, default: false },
  signedByLandlord: { type: Boolean, default: false },
  tenantSignedAt: Date,
  landlordSignedAt: Date,
  createdAt: { type: Date, default: Date.now }
});

const messageSchema = new mongoose.Schema({
  tenantId: String,
  landlordId: String,
  propertyId: String,
  message: String,
  senderRole: String,
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Property = mongoose.model('Property', propertySchema);
const Application = mongoose.model('Application', applicationSchema);
const Contract = mongoose.model('Contract', contractSchema);
const Message = mongoose.model('Message', messageSchema);

// ============================================
// AUTHENTICATION MIDDLEWARE
// ============================================
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// ============================================
// HEALTH CHECK ROUTES
// ============================================
app.get('/', (req, res) => res.json({ message: 'Roomivo API is running', status: 'ok' }));
app.get('/api/health', (req, res) => res.json({ status: '✅ Running', timestamp: new Date() }));

// ============================================
// AUTH ROUTES
// ============================================
app.post('/api/auth/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password, role } = req.body;
    
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hash = await bcrypt.hash(password, 10);
    const user = new User({ firstName, lastName, email, passwordHash: hash, role: role || 'tenant' });
    await user.save();

    const token = jwt.sign({ id: user._id, email }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.status(201).json({ token, user: { id: user._id, firstName, lastName, email, role: user.role } });
  } catch (error) {
    console.error('Register error:', error);
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
    if (!user) return res.status(404).json({ error: 'User not found' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid password' });

    const token = jwt.sign({ id: user._id, email }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user._id, firstName: user.firstName, lastName: user.lastName, email, role: user.role } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// PROPERTY ROUTES
// ============================================
app.get('/api/properties', async (req, res) => {
  try {
    const { city, minPrice, maxPrice, rooms } = req.query;
    const filter = {};
    
    if (city) filter.city = { $regex: city, $options: 'i' };
    if (minPrice) filter.price = { $gte: parseFloat(minPrice) };
    if (maxPrice) filter.price = { ...filter.price, $lte: parseFloat(maxPrice) };
    if (rooms) filter.rooms = parseInt(rooms);
    
    const properties = await Property.find(filter).limit(50);
    res.json(properties);
  } catch (error) {
    console.error('Get properties error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/properties/:id', async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ error: 'Property not found' });
    res.json(property);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/my-properties', authenticateToken, async (req, res) => {
  try {
    const properties = await Property.find({ landlordId: req.user.id });
    res.json(properties);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/properties', authenticateToken, async (req, res) => {
  try {
    const { title, description, city, price, rooms, amenities } = req.body;
    const property = new Property({
      landlordId: req.user.id,
      title,
      description,
      city,
      price,
      rooms,
      amenities: amenities || []
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
    if (!property) return res.status(404).json({ error: 'Property not found' });
    if (property.landlordId !== req.user.id) return res.status(403).json({ error: 'Unauthorized' });
    
    const { title, description, city, price, rooms, amenities } = req.body;
    property.title = title || property.title;
    property.description = description || property.description;
    property.city = city || property.city;
    property.price = price || property.price;
    property.rooms = rooms || property.rooms;
    property.amenities = amenities || property.amenities;
    
    await property.save();
    res.json(property);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/properties/:id', authenticateToken, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ error: 'Property not found' });
    if (property.landlordId !== req.user.id) return res.status(403).json({ error: 'Unauthorized' });
    
    await Property.findByIdAndDelete(req.params.id);
    res.json({ message: 'Property deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// APPLICATION ROUTES
// ============================================
app.post('/api/applications', authenticateToken, async (req, res) => {
  try {
    const { propertyId, applicationData } = req.body;
    const application = new Application({
      tenantId: req.user.id,
      propertyId,
      status: 'pending',
      applicationData
    });
    await application.save();
    res.status(201).json(application);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/applications', authenticateToken, async (req, res) => {
  try {
    let applications;
    
    if (req.user.role === 'landlord') {
      const properties = await Property.find({ landlordId: req.user.id });
      const propertyIds = properties.map(p => p._id.toString());
      applications = await Application.find({ propertyId: { $in: propertyIds } });
    } else {
      applications = await Application.find({ tenantId: req.user.id });
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
    
    if (!application) return res.status(404).json({ error: 'Application not found' });
    
    application.status = status;
    application.reviewedAt = new Date();
    await application.save();
    
    res.json(application);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CONTRACT ROUTES
// ============================================
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

app.post('/api/contracts/:id/sign', authenticateToken, async (req, res) => {
  try {
    const { isTenant } = req.body;
    const contract = await Contract.findById(req.params.id);
    
    if (!contract) return res.status(404).json({ error: 'Contract not found' });
    
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

// ============================================
// MESSAGING ROUTES
// ============================================
app.post('/api/messages', authenticateToken, async (req, res) => {
  try {
    const { tenantId, landlordId, propertyId, message } = req.body;
    const newMessage = new Message({
      tenantId,
      landlordId,
      propertyId,
      message,
      senderRole: req.user.role
    });
    await newMessage.save();
    res.status(201).json(newMessage);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/messages/:propertyId/:otherUserId', authenticateToken, async (req, res) => {
  try {
    const { propertyId, otherUserId } = req.params;
    const userId = req.user.id;

    const messages = await Message.find({
      propertyId,
      $or: [
        { tenantId: userId, landlordId: otherUserId },
        { tenantId: otherUserId, landlordId: userId }
      ]
    }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/conversations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const messages = await Message.find({
      $or: [{ tenantId: userId }, { landlordId: userId }]
    }).sort({ createdAt: -1 });

    const conversations = {};
    messages.forEach(msg => {
      const otherUserId = msg.tenantId === userId ? msg.landlordId : msg.tenantId;
      const key = `${msg.propertyId}-${otherUserId}`;
      if (!conversations[key]) {
        conversations[key] = {
          propertyId: msg.propertyId,
          otherUserId,
          lastMessage: msg.message,
          lastMessageTime: msg.createdAt,
          senderRole: msg.senderRole
        };
      }
    });

    res.json(Object.values(conversations));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// SOCKET.IO MESSAGING
// ============================================
io.on('connection', (socket) => {
  console.log(`👤 User connected: ${socket.id}`);

  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    console.log(`📍 User joined room: ${roomId}`);
  });

  socket.on('send-message', (data) => {
    io.to(data.roomId).emit('receive-message', data);
  });

  socket.on('disconnect', () => {
    console.log(`👤 User disconnected: ${socket.id}`);
  });
});

// ============================================
// ERROR HANDLING
// ============================================
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 5001;
httpServer.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
  console.log(`📊 Socket.io running on http://localhost:${PORT}`);
  console.log('✅ Server is ready for requests!');
});
