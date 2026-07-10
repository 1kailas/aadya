import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Load env locally (if using dotenv)
// import 'dotenv/config';

const app = express();
const PORT = process.env.PORT || 3000;

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production';
const ADMIN_PIN = process.env.ADMIN_PIN || '1234';

// ─── File Storage Helpers ────────────────────────────────────────────────

const BOOKINGS_FILE = path.join(process.cwd(), 'bookings.json');
const CONFIG_FILE = path.join(process.cwd(), 'config.json');

const getBookings = (): any[] => {
  if (!fs.existsSync(BOOKINGS_FILE)) {
    fs.writeFileSync(BOOKINGS_FILE, JSON.stringify([]));
  }
  const data = fs.readFileSync(BOOKINGS_FILE, 'utf-8');
  return JSON.parse(data || '[]');
};

const saveBookings = (data: any[]) => {
  fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(data, null, 2));
};

const getConfig = (): any => {
  const defaultCfg = {
    events: [
      {
        id: 'evt-calicut', name: 'Ice Immersion Workshop', desc: 'Beach Road Sanctuary, overlooking the Malabar coast.',
        address: 'Near Beach Road, Calicut, Kerala', startDate: '2026-07-10', endDate: '2026-07-24',
        timeSlots: ['10:00 AM','11:00 AM','12:00 PM','01:00 PM','02:00 PM','03:00 PM']
      }
    ],
    eventsPaused: false
  };
  if (!fs.existsSync(CONFIG_FILE)) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaultCfg, null, 2));
  }
  const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
  return JSON.parse(data || '{}');
};

const saveConfig = (data: any) => {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2));
};

// ─── Middleware ──────────────────────────────────────────────────────────

app.use(helmet());
app.use(cors());
app.use(express.json());

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api', apiLimiter);

const authenticateAdmin = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    if (!payload.admin) throw new Error('Invalid token');
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

// ─── Schemas ─────────────────────────────────────────────────────────────

const OrderSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().default('INR'),
});

const BookingDetailsSchema = z.object({
  location: z.string().min(1),
  date: z.string().min(1),
  timeSlot: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  medicalAgreed: z.boolean(),
  amount: z.number(),
});

const VerifyPaymentSchema = z.object({
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string().optional(),
  razorpay_signature: z.string().optional(),
  bookingDetails: BookingDetailsSchema,
  isSimulated: z.boolean().optional().default(false),
});

// ─── Razorpay Helper ─────────────────────────────────────────────────────

function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string, secret: string) {
  const generatedSignature = crypto
    .createHmac('sha256', secret)
    .update(orderId + '|' + paymentId)
    .digest('hex');
  return generatedSignature === signature;
}

// ─── Public API Routes ───────────────────────────────────────────────────

app.post('/api/auth/login', (req, res) => {
  const { pin } = req.body;
  if (pin === ADMIN_PIN) {
    const token = jwt.sign({ admin: true }, JWT_SECRET, { expiresIn: '12h' });
    return res.json({ success: true, token });
  }
  return res.status(401).json({ success: false, message: 'Invalid PIN' });
});

app.get('/api/config', (req, res) => {
  res.json(getConfig());
});

app.post('/api/create-order', async (req, res) => {
  try {
    const { amount, currency } = OrderSchema.parse(req.body);
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret || keyId === 'MY_RAZORPAY_KEY_ID') {
      const simulatedOrderId = 'order_sim_' + Math.random().toString(36).substring(2, 15);
      return res.json({ id: simulatedOrderId, amount: amount * 100, currency, simulated: true, key: 'rzp_test_placeholder' });
    }

    const amountInPaise = Math.round(amount * 100);
    const receipt = 'rcpt_' + Date.now() + '_' + Math.floor(Math.random() * 1000);

    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64'),
      },
      body: JSON.stringify({ amount: amountInPaise, currency, receipt }),
    });

    if (!response.ok) throw new Error(await response.text());
    const orderData = await response.json();
    return res.json({ ...(orderData as any), simulated: false, key: keyId });
  } catch (error: any) {
    const simulatedOrderId = 'order_sim_' + Math.random().toString(36).substring(2, 15);
    return res.json({ id: simulatedOrderId, amount: req.body.amount * 100, currency: 'INR', simulated: true, key: 'rzp_test_placeholder', error: error.message });
  }
});

app.post('/api/verify-payment', (req, res) => {
  try {
    const parsed = VerifyPaymentSchema.parse(req.body);
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingDetails, isSimulated } = parsed;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    let isValid = false;
    if (isSimulated || !keySecret || keySecret === 'MY_RAZORPAY_KEY_SECRET') {
      isValid = true;
    } else {
      isValid = verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id || '', razorpay_signature || '', keySecret);
    }

    if (isValid) {
      const newId = 'bk_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
      const pId = razorpay_payment_id || 'sim_pay_' + Date.now();
      const createdAt = new Date().toISOString();

      const newBooking = {
        id: newId,
        orderId: razorpay_order_id,
        paymentId: pId,
        location: bookingDetails.location,
        date: bookingDetails.date,
        timeSlot: bookingDetails.timeSlot,
        customerName: bookingDetails.name,
        customerEmail: bookingDetails.email,
        customerPhone: bookingDetails.phone,
        amount: bookingDetails.amount,
        status: 'Paid',
        medicalAgreed: bookingDetails.medicalAgreed ? 1 : 0,
        createdAt
      };

      const bookings = getBookings();
      bookings.push(newBooking);
      saveBookings(bookings);

      return res.json({ success: true, booking: newBooking });
    } else {
      return res.status(400).json({ success: false, message: 'Invalid signature' });
    }
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

// ─── Protected Admin API Routes ──────────────────────────────────────────

app.use('/api/bookings', authenticateAdmin);
app.use('/api/stats', authenticateAdmin);
// Note: /api/config GET is public, but PUT/POST/DELETE are protected.
// We handle that by protecting specific routes:

app.get('/api/bookings', (req, res) => {
  const bookings = getBookings().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json(bookings);
});

app.get('/api/stats', (req, res) => {
  const bookings = getBookings();
  const todayStr = new Date().toISOString().split('T')[0];
  const totalRevenue = bookings.reduce((sum, b) => sum + b.amount, 0);
  const todayCount = bookings.filter(b => b.date === todayStr).length;
  
  const byLocation: Record<string, number> = {};
  const revenueByDay: Record<string, number> = {};
  const bookingsByDay: Record<string, number> = {};

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    revenueByDay[key] = 0;
    bookingsByDay[key] = 0;
  }

  bookings.forEach((b) => {
    byLocation[b.location] = (byLocation[b.location] || 0) + 1;
    if (revenueByDay[b.date] !== undefined) {
      revenueByDay[b.date] += b.amount;
      bookingsByDay[b.date] = (bookingsByDay[b.date] || 0) + 1;
    }
  });

  const upcomingCount = bookings.filter(b => b.date >= todayStr && b.status !== 'Cancelled').length;
  res.json({ total: bookings.length, totalRevenue, todayCount, upcomingCount, byLocation, revenueByDay, bookingsByDay });
});

app.delete('/api/bookings/:id', (req, res) => {
  const id = req.params.id;
  let bookings = getBookings();
  const initialLength = bookings.length;
  bookings = bookings.filter(b => b.id !== id);
  if (bookings.length === initialLength) {
    return res.status(404).json({ success: false, message: 'Booking not found' });
  }
  saveBookings(bookings);
  res.json({ success: true, message: 'Booking deleted' });
});

app.patch('/api/bookings/:id', (req, res) => {
  const id = req.params.id;
  const { status } = req.body;
  if (!['Paid', 'Attended', 'Cancelled', 'No-Show'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' });
  }
  const bookings = getBookings();
  const index = bookings.findIndex(b => b.id === id);
  if (index === -1) return res.status(404).json({ success: false, message: 'Booking not found' });
  
  bookings[index].status = status;
  saveBookings(bookings);
  res.json({ success: true, booking: bookings[index] });
});

app.post('/api/bookings/reset', (req, res) => {
  saveBookings([]);
  res.json({ success: true, message: 'Bookings reset successfully' });
});

app.put('/api/config', authenticateAdmin, (req, res) => {
  const { events, eventsPaused } = req.body;
  const config = getConfig();

  if (events !== undefined) config.events = events;
  if (eventsPaused !== undefined) config.eventsPaused = eventsPaused;

  saveConfig(config);
  res.json({ success: true, config });
});

app.post('/api/config/events', authenticateAdmin, (req, res) => {
  const { name, desc, address, startDate, endDate, timeSlots } = req.body;
  const config = getConfig();
  
  const newEvent = { id: 'evt-' + Date.now() + Math.floor(Math.random() * 1000), name, desc, address, startDate, endDate, timeSlots };
  if (!config.events) config.events = [];
  config.events.push(newEvent);

  saveConfig(config);
  res.json({ success: true, config });
});

app.delete('/api/config/events/:id', authenticateAdmin, (req, res) => {
  const id = req.params.id;
  const config = getConfig();
  
  if (!config.events) config.events = [];
  const index = config.events.findIndex((e: any) => e.id === id);
  if (index === -1) return res.status(404).json({ success: false, message: 'Event not found' });
  
  config.events.splice(index, 1);
  saveConfig(config);
  res.json({ success: true, config });
});

// ─── Frontend Integration (Production) ───────────────────────────────────

// In production, serve the Vite static files if they exist
const distPath = path.join(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// ─── Start Server ────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Aadhya Wellness Server] Fullstack app running on http://0.0.0.0:${PORT}`);
});
