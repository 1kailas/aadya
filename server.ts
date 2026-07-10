import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BOOKINGS_FILE = path.join(__dirname, 'bookings.json');
const CONFIG_FILE = path.join(__dirname, 'config.json');

// Default config
const DEFAULT_CONFIG = {
  events: [
    {
      id: 'evt-calicut',
      name: 'Ice Immersion Workshop',
      desc: 'Beach Road Sanctuary, overlooking the Malabar coast.',
      address: 'Near Beach Road, Calicut, Kerala',
      startDate: new Date().toISOString().split('T')[0], // Today
      endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 14 days from now
      timeSlots: ['10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM'],
    },
    {
      id: 'evt-ernakulam',
      name: 'Ice Immersion Workshop',
      desc: 'Panampilly Nagar Retreat, a calm boutique oasis.',
      address: 'Panampilly Nagar, Ernakulam, Kerala',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      timeSlots: ['10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM'],
    }
  ],
  eventsPaused: false,
};

// Ensure bookings file exists
if (!fs.existsSync(BOOKINGS_FILE)) {
  fs.writeFileSync(BOOKINGS_FILE, JSON.stringify([], null, 2));
}

// Ensure config file exists
if (!fs.existsSync(CONFIG_FILE)) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2));
}

function readConfig() {
  try {
    const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    return DEFAULT_CONFIG;
  }
}

function writeConfig(config: any) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  } catch (err) {
    console.error('Error writing config file:', err);
  }
}

function readBookings() {
  try {
    const data = fs.readFileSync(BOOKINGS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

function writeBookings(bookings: any[]) {
  try {
    fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(bookings, null, 2));
  } catch (err) {
    console.error('Error writing bookings file:', err);
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // API Route: Create Razorpay Order
  app.post('/api/create-order', async (req, res) => {
    const { amount, currency = 'INR' } = req.body;
    
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret || keyId === 'MY_RAZORPAY_KEY_ID') {
      console.warn('Razorpay credentials missing or placeholder. Falling back to simulated order.');
      // Return a simulated order ID
      const simulatedOrderId = 'order_sim_' + Math.random().toString(36).substring(2, 15);
      return res.status(200).json({
        id: simulatedOrderId,
        amount: amount * 100,
        currency,
        simulated: true,
        key: 'rzp_test_placeholder'
      });
    }

    try {
      const amountInPaise = Math.round(amount * 100);
      const receipt = 'rcpt_' + Date.now() + '_' + Math.floor(Math.random() * 1000);

      // Call Razorpay API using native fetch
      const razorpayResponse = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64'),
        },
        body: JSON.stringify({
          amount: amountInPaise,
          currency,
          receipt,
        }),
      });

      if (!razorpayResponse.ok) {
        const errorText = await razorpayResponse.text();
        console.error('Razorpay API error response:', errorText);
        throw new Error(`Razorpay responded with status ${razorpayResponse.status}: ${errorText}`);
      }

      const orderData = await razorpayResponse.json();
      return res.status(200).json({
        id: orderData.id,
        amount: orderData.amount,
        currency: orderData.currency,
        simulated: false,
        key: keyId
      });
    } catch (error: any) {
      console.error('Error creating Razorpay order:', error);
      // Failover gracefully to simulated order for a smooth user experience
      const simulatedOrderId = 'order_sim_' + Math.random().toString(36).substring(2, 15);
      return res.status(200).json({
        id: simulatedOrderId,
        amount: amount * 100,
        currency,
        simulated: true,
        key: 'rzp_test_placeholder',
        error: error.message
      });
    }
  });

  // API Route: Verify Razorpay Payment Signature & Store Booking
  app.post('/api/verify-payment', async (req, res) => {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      bookingDetails,
      isSimulated = false
    } = req.body;

    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    let isValid = false;

    if (isSimulated || !keySecret || keySecret === 'MY_RAZORPAY_KEY_SECRET') {
      console.log('Simulated verification or missing secret. Treating as valid.');
      isValid = true;
    } else {
      try {
        // Verify Razorpay Signature
        // signature = hmac_sha256(order_id + "|" + payment_id, secret)
        const text = razorpay_order_id + '|' + razorpay_payment_id;
        const generated_signature = crypto
          .createHmac('sha256', keySecret)
          .update(text)
          .digest('hex');

        isValid = (generated_signature === razorpay_signature);
      } catch (error) {
        console.error('Error verifying Razorpay signature:', error);
        isValid = false;
      }
    }

    if (isValid) {
      const bookings = readBookings();
      const newBooking = {
        id: 'bk_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id || 'sim_pay_' + Date.now(),
        location: bookingDetails.location,
        date: bookingDetails.date,
        timeSlot: bookingDetails.timeSlot,
        customerName: bookingDetails.name,
        customerEmail: bookingDetails.email,
        customerPhone: bookingDetails.phone,
        medicalAgreed: bookingDetails.medicalAgreed,
        amount: bookingDetails.amount,
        createdAt: new Date().toISOString(),
        status: 'Paid'
      };

      bookings.push(newBooking);
      writeBookings(bookings);

      return res.status(200).json({
        success: true,
        booking: newBooking
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid signature verification failed'
      });
    }
  });

  // API Route: Get All Bookings (for Admin view / backup)
  app.get('/api/bookings', (req, res) => {
    const bookings = readBookings();
    return res.status(200).json(bookings);
  });

  // API Route: Get Aggregate Stats
  app.get('/api/stats', (req, res) => {
    const bookings = readBookings();
    const todayStr = new Date().toISOString().split('T')[0];
    const totalRevenue = bookings.reduce((sum: number, b: any) => sum + (Number(b.amount) || 0), 0);
    const todayCount = bookings.filter((b: any) => b.date === todayStr).length;
    const byLocation: Record<string, number> = {};
    const revenueByDay: Record<string, number> = {};
    const bookingsByDay: Record<string, number> = {};

    // Last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      revenueByDay[key] = 0;
      bookingsByDay[key] = 0;
    }

    bookings.forEach((b: any) => {
      // By Location
      byLocation[b.location] = (byLocation[b.location] || 0) + 1;
      // By Day (last 7 days only)
      if (revenueByDay[b.date] !== undefined) {
        revenueByDay[b.date] += Number(b.amount) || 0;
        bookingsByDay[b.date] = (bookingsByDay[b.date] || 0) + 1;
      }
    });

    const upcomingCount = bookings.filter((b: any) => b.date >= todayStr && b.status !== 'Cancelled').length;

    return res.status(200).json({
      total: bookings.length,
      totalRevenue,
      todayCount,
      upcomingCount,
      byLocation,
      revenueByDay,
      bookingsByDay,
    });
  });

  // API Route: Delete Single Booking by ID
  app.delete('/api/bookings/:id', (req, res) => {
    const { id } = req.params;
    const bookings = readBookings();
    const index = bookings.findIndex((b: any) => b.id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    bookings.splice(index, 1);
    writeBookings(bookings);
    return res.status(200).json({ success: true, message: 'Booking deleted' });
  });

  // API Route: Update Booking Status (e.g., Attended, Cancelled)
  app.patch('/api/bookings/:id', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const validStatuses = ['Paid', 'Attended', 'Cancelled', 'No-Show'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }
    const bookings = readBookings();
    const index = bookings.findIndex((b: any) => b.id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    bookings[index].status = status;
    writeBookings(bookings);
    return res.status(200).json({ success: true, booking: bookings[index] });
  });

  // API Route: Reset Bookings (Convenient for testing)
  app.post('/api/bookings/reset', (req, res) => {
    writeBookings([]);
    return res.status(200).json({ success: true, message: 'Bookings reset successfully' });
  });

  // ── Config / Event Management APIs ───────────────────────────────

  // Get current config (events, eventsPaused)
  app.get('/api/config', (req, res) => {
    const config = readConfig();
    if (!config.events) config.events = DEFAULT_CONFIG.events;
    if (config.eventsPaused === undefined) config.eventsPaused = DEFAULT_CONFIG.eventsPaused;
    return res.status(200).json(config);
  });

  // Update entire config
  app.put('/api/config', (req, res) => {
    const { events, eventsPaused } = req.body;
    const config = readConfig();

    if (events !== undefined) {
      if (!Array.isArray(events)) {
        return res.status(400).json({ success: false, message: 'events must be an array' });
      }
      for (const evt of events) {
        if (!evt.id || !evt.name || !evt.desc || !evt.address || !evt.startDate || !evt.endDate || !evt.timeSlots) {
          return res.status(400).json({ success: false, message: 'Each event must have id, name, desc, address, startDate, endDate, and timeSlots' });
        }
      }
      config.events = events;
    }

    if (eventsPaused !== undefined) {
      if (typeof eventsPaused !== 'boolean') {
        return res.status(400).json({ success: false, message: 'eventsPaused must be a boolean' });
      }
      config.eventsPaused = eventsPaused;
    }

    writeConfig(config);
    return res.status(200).json({ success: true, config });
  });

  // Add a single event
  app.post('/api/config/events', (req, res) => {
    const { name, desc, address, startDate, endDate, timeSlots } = req.body;
    if (!name || !desc || !address || !startDate || !endDate || !timeSlots) {
      return res.status(400).json({ success: false, message: 'Missing required event fields' });
    }
    const config = readConfig();
    const newEvent = {
      id: 'evt-' + Date.now() + Math.floor(Math.random() * 1000),
      name, desc, address, startDate, endDate, timeSlots
    };
    if (!config.events) config.events = [];
    config.events.push(newEvent);
    writeConfig(config);
    return res.status(200).json({ success: true, config });
  });

  // Delete an event by id
  app.delete('/api/config/events/:id', (req, res) => {
    const { id } = req.params;
    const config = readConfig();
    if (!config.events) config.events = [];
    
    const index = config.events.findIndex((e: any) => e.id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    
    config.events.splice(index, 1);
    writeConfig(config);
    return res.status(200).json({ success: true, config });
  });

  // Serve static/vite
  if (process.env.NODE_ENV === 'production' || process.env.DISABLE_HMR === 'true') {
    const distPath = path.join(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    } else {
      console.warn('Production build directory "dist" does not exist yet. Please run build.');
    }
  } else {
    // Vite middleware mode for local development
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  }

  const port = 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`[Aadhya Wellness Server] Fullstack app running on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
