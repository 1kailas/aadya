import { Hono } from 'hono';
import { handle } from 'hono/cloudflare-pages';
import { sign, verify } from 'hono/jwt';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';

type Bindings = {
  KV_DATA: KVNamespace;
  JWT_SECRET: string;
  ADMIN_PIN: string;
  RAZORPAY_KEY_ID: string;
  RAZORPAY_KEY_SECRET: string;
};

const app = new Hono<{ Bindings: Bindings }>().basePath('/api');

// ─── KV Storage Helpers ──────────────────────────────────────────────────

const getBookings = async (env: Bindings): Promise<any[]> => {
  const data = await env.KV_DATA.get('bookings', 'json');
  return (data as any[]) || [];
};

const saveBookings = async (env: Bindings, data: any[]) => {
  await env.KV_DATA.put('bookings', JSON.stringify(data));
};

const getConfig = async (env: Bindings): Promise<any> => {
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
  const data = await env.KV_DATA.get('config', 'json');
  return data || defaultCfg;
};

const saveConfig = async (env: Bindings, data: any) => {
  await env.KV_DATA.put('config', JSON.stringify(data));
};

// ─── Middleware ──────────────────────────────────────────────────────────

app.use('*', async (c, next) => {
  // CORS is automatic because it runs on the same Cloudflare Pages domain
  await next();
});

const authenticateAdmin = async (c: any, next: any) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ success: false, message: 'Unauthorized' }, 401);
  }
  const token = authHeader.split(' ')[1];
  try {
    const payload = await verify(token, c.env.JWT_SECRET || 'fallback-secret-change-in-production', 'HS256');
    if (!payload.admin) throw new Error('Invalid token');
    await next();
  } catch (err) {
    return c.json({ success: false, message: 'Invalid or expired token' }, 401);
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

// ─── Web Crypto Helpers ──────────────────────────────────────────────────

async function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string, secret: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    enc.encode(orderId + '|' + paymentId)
  );
  
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  const hex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hex === signature;
}

// ─── Auth Routes ───────────────────────────────────────────────────────

app.post('/auth/login', async (c) => {
  const body = await c.req.json();
  const pin = body.pin;
  const adminPin = c.env.ADMIN_PIN || '1234';
  
  if (pin === adminPin) {
    const token = await sign({ admin: true, exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60 }, c.env.JWT_SECRET || 'fallback-secret-change-in-production', 'HS256');
    return c.json({ success: true, token });
  }
  return c.json({ success: false, message: 'Invalid PIN' }, 401);
});

// ─── Public Booking Routes ─────────────────────────────────────────────

app.post('/create-order', zValidator('json', OrderSchema), async (c) => {
  const { amount, currency } = c.req.valid('json');
  const keyId = c.env.RAZORPAY_KEY_ID;
  const keySecret = c.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret || keyId === 'MY_RAZORPAY_KEY_ID') {
    const simulatedOrderId = 'order_sim_' + Math.random().toString(36).substring(2, 15);
    return c.json({ id: simulatedOrderId, amount: amount * 100, currency, simulated: true, key: 'rzp_test_placeholder' });
  }

  const amountInPaise = Math.round(amount * 100);
  const receipt = 'rcpt_' + Date.now() + '_' + Math.floor(Math.random() * 1000);

  try {
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + btoa(`${keyId}:${keySecret}`),
      },
      body: JSON.stringify({ amount: amountInPaise, currency, receipt }),
    });

    if (!response.ok) throw new Error(await response.text());
    const orderData = await response.json();
    return c.json({ ...(orderData as any), simulated: false, key: keyId });
  } catch (error: any) {
    console.error(error);
    const simulatedOrderId = 'order_sim_' + Math.random().toString(36).substring(2, 15);
    return c.json({ id: simulatedOrderId, amount: amount * 100, currency: 'INR', simulated: true, key: 'rzp_test_placeholder', error: error.message });
  }
});

app.post('/verify-payment', zValidator('json', VerifyPaymentSchema), async (c) => {
  const parsed = c.req.valid('json');
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingDetails, isSimulated } = parsed;
  const keySecret = c.env.RAZORPAY_KEY_SECRET;
  
  let isValid = false;
  if (isSimulated || !keySecret || keySecret === 'MY_RAZORPAY_KEY_SECRET') {
    isValid = true;
  } else {
    isValid = await verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id || '', razorpay_signature || '', keySecret);
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

    const bookings = await getBookings(c.env);
    bookings.push(newBooking);
    await saveBookings(c.env, bookings);

    return c.json({ success: true, booking: newBooking });
  } else {
    return c.json({ success: false, message: 'Invalid signature' }, 400);
  }
});

app.get('/config', async (c) => {
  const config = await getConfig(c.env);
  return c.json(config);
});

// ─── Protected Admin Routes ────────────────────────────────────────────

app.use('/bookings/*', authenticateAdmin);
app.use('/stats', authenticateAdmin);
app.use('/config/*', authenticateAdmin);

app.get('/bookings', async (c) => {
  const bookings = await getBookings(c.env);
  bookings.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return c.json(bookings);
});

app.get('/stats', async (c) => {
  const bookings = await getBookings(c.env);
  
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
  return c.json({ total: bookings.length, totalRevenue, todayCount, upcomingCount, byLocation, revenueByDay, bookingsByDay });
});

app.delete('/bookings/:id', async (c) => {
  const id = c.req.param('id');
  let bookings = await getBookings(c.env);
  const initialLength = bookings.length;
  bookings = bookings.filter(b => b.id !== id);
  if (bookings.length === initialLength) {
    return c.json({ success: false, message: 'Booking not found' }, 404);
  }
  await saveBookings(c.env, bookings);
  return c.json({ success: true, message: 'Booking deleted' });
});

app.patch('/bookings/:id', async (c) => {
  const id = c.req.param('id');
  const { status } = await c.req.json();
  if (!['Paid', 'Attended', 'Cancelled', 'No-Show'].includes(status)) {
    return c.json({ success: false, message: 'Invalid status' }, 400);
  }
  const bookings = await getBookings(c.env);
  const index = bookings.findIndex(b => b.id === id);
  if (index === -1) return c.json({ success: false, message: 'Booking not found' }, 404);
  
  bookings[index].status = status;
  await saveBookings(c.env, bookings);
  return c.json({ success: true, booking: bookings[index] });
});

app.post('/bookings/reset', async (c) => {
  await saveBookings(c.env, []);
  return c.json({ success: true, message: 'Bookings reset successfully' });
});

app.put('/config', async (c) => {
  const { events, eventsPaused } = await c.req.json();
  const config = await getConfig(c.env);

  if (events !== undefined) config.events = events;
  if (eventsPaused !== undefined) config.eventsPaused = eventsPaused;

  await saveConfig(c.env, config);
  return c.json({ success: true, config });
});

app.post('/config/events', async (c) => {
  const { name, desc, address, startDate, endDate, timeSlots } = await c.req.json();
  const config = await getConfig(c.env);
  
  const newEvent = { id: 'evt-' + Date.now() + Math.floor(Math.random() * 1000), name, desc, address, startDate, endDate, timeSlots };
  if (!config.events) config.events = [];
  config.events.push(newEvent);

  await saveConfig(c.env, config);
  return c.json({ success: true, config });
});

app.delete('/config/events/:id', async (c) => {
  const id = c.req.param('id');
  const config = await getConfig(c.env);
  
  if (!config.events) config.events = [];
  const index = config.events.findIndex((e: any) => e.id === id);
  if (index === -1) return c.json({ success: false, message: 'Event not found' }, 404);
  
  config.events.splice(index, 1);
  await saveConfig(c.env, config);
  return c.json({ success: true, config });
});

export const onRequest = handle(app);
