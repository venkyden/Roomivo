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

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

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

const User = mongoose.model('User', userSchema);
const Property = mongoose.model('Property', propertySchema);

const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// AUTH ROUTES
app.post('/api/auth/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password, role } = req.body;
    const hash = await bcrypt.hash(password, 10);
    const user = new User({ firstName, lastName, email, passwordHash: hash, role });
    await user.save();
    const token = jwt.sign({ id: user._id, email }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user._id, firstName, lastName, email, role } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid password' });
    const token = jwt.sign({ id: user._id, email }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user._id, firstName: user.firstName, lastName: user.lastName, email, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PROPERTY ROUTES
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

// HEALTH CHECK
app.get('/', (req, res) => res.json({ message: 'Roomivo API is running', status: 'ok' }));
app.get('/api/health', (req, res) => res.json({ status: '✅ Running' }));

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
});
