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
  amenities: [String]
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

app.get('/api/properties', async (req, res) => {
  const properties = await Property.find().limit(50);
  res.json(properties);
});

app.post('/api/properties', authenticateToken, async (req, res) => {
  const property = new Property({ landlordId: req.user.id, ...req.body });
  await property.save();
  res.status(201).json(property);
});

app.get('/', (req, res) => res.json({ message: 'Roomivo API is running', status: 'ok' }));

app.get('/api/health', (req, res) => res.json({ status: '✅ Running' }));

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
});
