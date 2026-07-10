import React, { useState, useEffect, useCallback } from 'react';
import {
  MapPin,
  Calendar as CalendarIcon,
  Clock,
  User,
  Mail,
  Phone,
  ShieldAlert,
  CheckCircle,
  TrendingUp,
  Sparkles,
  Check,
  Loader2,
  ArrowRight,
  Lock,
  Coffee,
  Activity,
  Settings,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Download,
  Eye,
  X,
  BarChart2,
  DollarSign,
  Users,
  CalendarCheck,
  ChevronDown,
  Filter,
  Search,
  Shield,
  LogOut,
  Edit2,
  MessageSquare,
  Star,
  Database,
  Plus,
  Save,
} from 'lucide-react';

// ─── Brand ──────────────────────────────────────────────────────────────
const BRAND = '#8f501c';

// ─── Logo ────────────────────────────────────────────────────────────────
const AadhyaLogo = ({ className = 'w-12 h-12', color = BRAND }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M50 30C52.2091 30 54 28.2091 54 26C54 23.7909 52.2091 22 50 22C47.7909 22 46 23.7909 46 26C46 28.2091 47.7909 30 50 30Z" fill={color} />
    <path d="M50 34C44 42 41 49 41 55C41 59 44 61 50 61C56 61 59 59 59 55C59 49 56 42 50 34Z" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M48 58C36 58 26 50 26 46C26 42 34 42 45 48L48 58Z" fill={color} opacity="0.85" />
    <path d="M52 58C64 58 74 50 74 46C74 42 66 42 55 48L52 58Z" fill={color} opacity="0.85" />
    <path d="M32 64C42 68 58 68 68 64C64 61 57 60 50 60C43 60 36 61 32 64Z" fill={color} />
  </svg>
);

// ─── Types ───────────────────────────────────────────────────────────────
interface Booking {
  id: string;
  orderId: string;
  paymentId: string;
  location: string;
  date: string;
  timeSlot: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  amount: number;
  createdAt: string;
  status: string;
  medicalAgreed?: boolean;
}

interface Stats {
  total: number;
  totalRevenue: number;
  todayCount: number;
  upcomingCount: number;
  byLocation: Record<string, number>;
  revenueByDay: Record<string, number>;
  bookingsByDay: Record<string, number>;
}

interface EventConfig {
  id: string;
  name: string;
  desc: string;
  address: string;
  startDate: string;
  endDate: string;
  timeSlots: string[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────
const getStatusClass = (status: string) => {
  switch (status) {
    case 'Paid':      return 'status-paid';
    case 'Attended':  return 'status-attended';
    case 'Cancelled': return 'status-cancelled';
    case 'No-Show':   return 'status-no-show';
    default:          return 'status-paid';
  }
};

const formatDate = (raw: string) => {
  if (!raw) return '';
  const d = new Date(raw + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
};

const exportCSV = (bookings: Booking[]) => {
  const headers = ['ID', 'Customer Name', 'Email', 'Phone', 'Location', 'Date', 'Time Slot', 'Amount (₹)', 'Status', 'Created At', 'Order ID', 'Payment ID'];
  const rows = bookings.map(b => [
    b.id, b.customerName, b.customerEmail, b.customerPhone,
    b.location, b.date, b.timeSlot, b.amount, b.status,
    new Date(b.createdAt).toLocaleString('en-IN'), b.orderId, b.paymentId
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `aadhya-bookings-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

// ─── Mini Bar Chart (pure SVG) ────────────────────────────────────────────
const MiniBarChart = ({ data }: { data: Record<string, number> }) => {
  const entries = Object.entries(data);
  const max = Math.max(...entries.map(([, v]) => v), 1);
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="flex items-end gap-1 h-20 w-full">
      {entries.map(([date, value], i) => {
        const pct = (value / max) * 100;
        const isToday = date === today;
        const label = new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short' }).slice(0, 3);
        return (
          <div key={date} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex items-end justify-center" style={{ height: '64px' }}>
              <div
                className="w-full rounded-t-md chart-bar"
                style={{
                  height: `${Math.max(pct, 4)}%`,
                  background: isToday ? BRAND : 'rgba(143,80,28,0.25)',
                  animationDelay: `${i * 0.07}s`,
                  transition: 'background 0.2s',
                }}
                title={`${label}: ${value} booking(s)`}
              />
            </div>
            <span className="text-[9px] text-gray-400 font-medium">{label}</span>
          </div>
        );
      })}
    </div>
  );
};

// ─── Stat Card ────────────────────────────────────────────────────────────
const StatCard = ({
  icon,
  label,
  value,
  sub,
  color = '#8f501c',
  delay = 0,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  delay?: number;
}) => (
  <div
    className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm card-lift animate-slide-up"
    style={{ animationDelay: `${delay}s` }}
  >
    <div className="flex items-start justify-between mb-3">
      <div className="p-2.5 rounded-xl" style={{ background: `${color}15` }}>
        <div style={{ color }}>{icon}</div>
      </div>
    </div>
    <div className="animate-count-up" style={{ animationDelay: `${delay + 0.1}s` }}>
      <span className="text-2xl font-bold text-[#2b2520] block">{value}</span>
      <span className="text-xs text-gray-500 font-medium">{label}</span>
      {sub && <span className="text-[10px] text-gray-400 block mt-0.5">{sub}</span>}
    </div>
  </div>
);

// ─── Booking Detail Modal ─────────────────────────────────────────────────
const BookingDetailModal = ({
  booking,
  onClose,
  onStatusChange,
  onDelete,
}: {
  booking: Booking;
  onClose: () => void;
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string) => void;
}) => {
  const statuses = ['Paid', 'Attended', 'Cancelled', 'No-Show'];
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in px-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#2b2520] to-[#4a3828] px-6 py-5 flex items-center justify-between">
          <div>
            <h3 className="text-white font-bold text-lg">{booking.customerName}</h3>
            <span className="text-[10px] text-gray-400 font-mono">{booking.id}</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Status Selector */}
          <div>
            <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-2">Update Status</label>
            <div className="flex gap-2 flex-wrap">
              {statuses.map(s => (
                <button
                  key={s}
                  onClick={() => onStatusChange(booking.id, s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all ${
                    booking.status === s
                      ? 'border-[#8f501c] bg-[#8f501c] text-white'
                      : 'border-gray-200 text-gray-600 hover:border-[#8f501c]/40'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Location', value: `Aadhya ${booking.location}` },
              { label: 'Date', value: formatDate(booking.date) },
              { label: 'Time Slot', value: booking.timeSlot },
              { label: 'Amount', value: `₹${booking.amount}` },
              { label: 'Phone', value: booking.customerPhone },
              { label: 'Email', value: booking.customerEmail },
              { label: 'Booked At', value: new Date(booking.createdAt).toLocaleString('en-IN') },
              { label: 'Payment ID', value: booking.paymentId },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-50 rounded-xl p-3">
                <span className="text-[9px] uppercase text-gray-400 font-bold block">{label}</span>
                <span className="text-xs font-semibold text-[#2b2520] break-all">{value}</span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => { if (confirm('Delete this booking permanently?')) onDelete(booking.id); }}
              className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Booking
            </button>
            <button onClick={onClose} className="flex-1 bg-[#8f501c] hover:bg-[#784114] text-white py-2.5 rounded-xl text-xs font-semibold transition-all">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Admin PIN Screen ─────────────────────────────────────────────────────
const AdminPinScreen = ({ onSuccess }: { onSuccess: (token: string) => void }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleKey = async (k: string) => {
    if (k === 'del') {
      setPin(p => p.slice(0, -1));
      setError(false);
      return;
    }
    if (pin.length >= 4 || loading) return;
    const next = pin + k;
    setPin(next);
    if (next.length === 4) {
      setLoading(true);
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin: next }),
        });
        const data = await res.json();
        if (data.success) {
          setTimeout(() => onSuccess(data.token), 200);
        } else {
          setError(true);
          setShake(true);
          setTimeout(() => { setPin(''); setShake(false); }, 700);
        }
      } catch (err) {
        setError(true);
        setShake(true);
        setTimeout(() => { setPin(''); setShake(false); }, 700);
      } finally {
        setLoading(false);
      }
    }
  };

  const keys = ['1','2','3','4','5','6','7','8','9','','0','del'];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#fdfbf7] via-[#f5ede3] to-[#ede0d0] px-4">
      <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-sm text-center animate-scale-in">
        <div className="w-16 h-16 bg-[#8f501c]/10 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse-ring">
          <Shield className="w-8 h-8 text-[#8f501c]" />
        </div>
        <h2 className="text-xl font-bold text-[#2b2520] mb-1">Admin Portal</h2>
        <p className="text-xs text-gray-400 mb-8">Enter your 4-digit PIN to continue</p>

        {/* PIN Dots */}
        <div className={`flex gap-4 justify-center mb-8 ${shake ? 'animate-shake' : ''}`}>
          {[0,1,2,3].map(i => (
            <div key={i} className={`pin-dot ${i < pin.length ? 'filled' : ''} ${error ? '!border-red-500 !bg-red-500' : ''}`} />
          ))}
        </div>

        {error && <p className="text-xs text-red-500 mb-4 animate-slide-down">Incorrect PIN. Try again.</p>}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3">
          {keys.map((k, idx) => (
            <button
              key={idx}
              onClick={() => k && handleKey(k)}
              disabled={!k}
              className={`h-14 rounded-2xl font-bold text-lg transition-all ${
                !k ? 'invisible' :
                k === 'del' ? 'bg-gray-100 text-gray-500 hover:bg-gray-200 text-sm' :
                'bg-[#fdfbf7] hover:bg-[#8f501c]/10 text-[#2b2520] active:scale-95 border border-gray-100'
              }`}
            >
              {k === 'del' ? '⌫' : k}
            </button>
          ))}
        </div>

        <p className="text-[10px] text-gray-300 mt-6">Default PIN: 1234</p>
      </div>
    </div>
  );
};

// ─── Main App ─────────────────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab] = useState<'booking' | 'admin'>('booking');
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);
  const [adminToken, setAdminToken] = useState<string | null>(null);

  const fetchAdmin = async (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers || {});
    if (adminToken) headers.set('Authorization', `Bearer ${adminToken}`);
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401) {
      setAdminAuthenticated(false);
      setAdminToken(null);
      setActiveTab('booking');
    }
    return res;
  };

  // Booking state
  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [cardiacOk, setCardiacOk] = useState(false);
  const [pregnancyOk, setPregnancyOk] = useState(false);
  const [liabilityAgreed, setLiabilityAgreed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [currentBooking, setCurrentBooking] = useState<Booking | null>(null);
  const [showSimModal, setShowSimModal] = useState(false);
  const [simulatedOrderId, setSimulatedOrderId] = useState('');
  const [simulatedAmount, setSimulatedAmount] = useState(0);

  // Admin state
  const [adminBookings, setAdminBookings] = useState<Booking[]>([]);
  const [adminStats, setAdminStats] = useState<Stats | null>(null);
  const [adminPhone, setAdminPhone] = useState('919876543210');
  const [adminSearch, setAdminSearch] = useState('');
  const [filterLocation, setFilterLocation] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterDate, setFilterDate] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [adminActiveTab, setAdminActiveTab] = useState<'dashboard' | 'bookings' | 'settings'>('dashboard');
  const [statsLoading, setStatsLoading] = useState(false);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'amount'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const programPrice = 1499;

  // Dynamic events from server config
  const [events, setEvents] = useState<EventConfig[]>([]);
  const [eventsLoaded, setEventsLoaded] = useState(false);

  // New event form state (admin)
  const [newEventName, setNewEventName] = useState('');
  const [newEventDesc, setNewEventDesc] = useState('');
  const [newEventAddress, setNewEventAddress] = useState('');
  const [newEventStartDate, setNewEventStartDate] = useState('');
  const [newEventEndDate, setNewEventEndDate] = useState('');
  const [newEventTimeSlots, setNewEventTimeSlots] = useState(''); // comma separated
  const [eventSaving, setEventSaving] = useState(false);
  const [eventError, setEventError] = useState('');
  const [eventSuccess, setEventSuccess] = useState('');

  // Edit event state (admin) -> currently not used if we only do add/delete for simplicity, but let's keep a toggle.
  const [eventsPaused, setEventsPaused] = useState(false);

  const getNextDays = () => {
    if (!selectedEventId) return [];
    const evt = events.find(e => e.id === selectedEventId);
    if (!evt) return [];

    const days = [];
    const weekdays = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const months   = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    
    let current = new Date(evt.startDate);
    const end = new Date(evt.endDate);
    const today = new Date();
    today.setHours(0,0,0,0);
    
    if (current < today) current = new Date(today);

    while (current <= end) {
      const raw = current.toISOString().split('T')[0];
      days.push({
        raw,
        formatted: `${weekdays[current.getDay()]}, ${current.getDate()} ${months[current.getMonth()]}`,
        dayNum: current.getDate(),
        dayName: weekdays[current.getDay()],
        month: months[current.getMonth()],
      });
      current.setDate(current.getDate() + 1);
    }
    return days;
  };
  const nextDays = getNextDays();

  // Update selectedDate if it's out of bounds when event changes
  useEffect(() => {
    if (nextDays.length > 0 && !nextDays.find(d => d.raw === selectedDate)) {
      setSelectedDate(nextDays[0].raw);
    }
  }, [selectedEventId, events]);

  // Fetch full config from server on mount
  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const config = await res.json();
        if (config.events && config.events.length > 0) {
          setEvents(config.events);
          if (!selectedEventId || !config.events.find((e: EventConfig) => e.id === selectedEventId)) {
            setSelectedEventId(config.events[0].id);
          }
        }
        if (config.eventsPaused !== undefined) {
          setEventsPaused(config.eventsPaused);
        }
        setEventsLoaded(true);
      }
    } catch (e) {
      console.error('Failed to fetch config:', e);
      setEventsLoaded(true);
    }
  }, [selectedEventId]);

  useEffect(() => {
    fetchConfig();
  }, []);

  // ── Admin Data Fetch ───────────────────────────────────────────────────
  const fetchBookings = useCallback(async () => {
    setBookingsLoading(true);
    try {
      const res = await fetchAdmin('/api/bookings');
      if (res.ok) setAdminBookings(await res.json());
    } catch (e) { console.error(e); }
    finally { setBookingsLoading(false); }
  }, [adminToken]);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetchAdmin('/api/stats');
      if (res.ok) setAdminStats(await res.json());
    } catch (e) { console.error(e); }
    finally { setStatsLoading(false); }
  }, [adminToken]);

  useEffect(() => {
    if (activeTab === 'admin' && adminAuthenticated) {
      fetchBookings();
      fetchStats();
    }
  }, [activeTab, adminAuthenticated]);

  // ── Razorpay ───────────────────────────────────────────────────────────
  const loadRazorpayScript = (): Promise<boolean> =>
    new Promise(resolve => {
      if ((window as any).Razorpay) { resolve(true); return; }
      const s = document.createElement('script');
      s.src = 'https://checkout.razorpay.com/v1/checkout.js';
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.body.appendChild(s);
    });

  // ── Booking Submit ─────────────────────────────────────────────────────
  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!selectedTimeSlot)   { setErrorMessage('Please select a time slot.');                             return; }
    if (!name.trim())        { setErrorMessage('Please enter your full name.');                           return; }
    if (!email.trim())       { setErrorMessage('Please enter your email address.');                       return; }
    if (!phone.trim())       { setErrorMessage('Please enter your phone number.');                        return; }
    if (!cardiacOk || !pregnancyOk || !liabilityAgreed) {
      setErrorMessage('Please agree to all medical safety terms.');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: programPrice }),
      });
      if (!res.ok) throw new Error('Failed to communicate with booking server');
      const orderData = await res.json();
      if (orderData.simulated) {
        setSimulatedOrderId(orderData.id);
        setSimulatedAmount(orderData.amount / 100);
        setShowSimModal(true);
        setIsLoading(false);
        return;
      }
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        setSimulatedOrderId(orderData.id);
        setSimulatedAmount(orderData.amount / 100);
        setShowSimModal(true);
        setIsLoading(false);
        return;
      }
      const options = {
        key: orderData.key, amount: orderData.amount, currency: orderData.currency,
        name: 'Aadhya Wellness', description: `Ice Immersion Session — ${events.find(e => e.id === selectedEventId)?.name || 'Unknown'}`,
        order_id: orderData.id,
        handler: async (response: any) => {
          setIsLoading(true);
          try {
            const vRes = await fetch('/api/verify-payment', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                bookingDetails: { location: events.find(e => e.id === selectedEventId)?.name || 'Unknown', date: selectedDate, timeSlot: selectedTimeSlot, name, email, phone, medicalAgreed: true, amount: programPrice },
              }),
            });
            const vData = await vRes.json();
            if (vData.success) { setCurrentBooking(vData.booking); resetForm(); }
            else setErrorMessage('Payment verification failed. Please contact support.');
          } catch (err: any) { setErrorMessage('Error verifying payment: ' + err.message); }
          finally { setIsLoading(false); }
        },
        prefill: { name, email, contact: phone },
        theme: { color: BRAND },
        modal: { ondismiss: () => setIsLoading(false) },
      };
      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', (r: any) => { setErrorMessage(`Payment failed: ${r.error.description}`); setIsLoading(false); });
      rzp.open();
    } catch {
      const simId = 'order_sim_' + Math.random().toString(36).substring(2, 10);
      setSimulatedOrderId(simId); setSimulatedAmount(programPrice); setShowSimModal(true);
    } finally { setIsLoading(false); }
  };

  const resetForm = () => {
    setSelectedTimeSlot(''); setName(''); setEmail(''); setPhone('');
    setCardiacOk(false); setPregnancyOk(false); setLiabilityAgreed(false);
  };

  // ── Simulated Payment ──────────────────────────────────────────────────
  const handleSimulatedPayment = async (success: boolean) => {
    setShowSimModal(false);
    if (!success) { setErrorMessage('Payment was cancelled.'); return; }
    setIsLoading(true);
    try {
      const res = await fetch('/api/verify-payment', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_order_id: simulatedOrderId,
          razorpay_payment_id: 'pay_sim_' + Math.random().toString(36).substring(2, 12),
          razorpay_signature: 'sim_sig_' + Math.random().toString(36).substring(2, 10),
          isSimulated: true,
          bookingDetails: { location: events.find(e => e.id === selectedEventId)?.name || 'Unknown', date: selectedDate, timeSlot: selectedTimeSlot, name, email, phone, medicalAgreed: true, amount: programPrice },
        }),
      });
      const data = await res.json();
      if (data.success) { setCurrentBooking(data.booking); resetForm(); }
      else setErrorMessage('Simulation booking creation failed.');
    } catch (err: any) { setErrorMessage('Error: ' + err.message); }
    finally { setIsLoading(false); }
  };

  // ── Admin Actions ──────────────────────────────────────────────────────
  const getWhatsAppLink = (booking: Booking) => {
    const msg = [
      `*Aadhya Wellness — Booking Confirmed!* 🎉`,
      ``,
      `*Ref:* \`${booking.id}\``,
      ``,
      `*👤 Client Details:*`,
      `• Name: ${booking.customerName}`,
      `• Phone: ${booking.customerPhone}`,
      `• Email: ${booking.customerEmail}`,
      ``,
      `*🧊 Session Details:*`,
      `• Program: Ice Immersion`,
      `• Location: Aadhya ${booking.location}`,
      `• Date: ${formatDate(booking.date)}`,
      `• Time: ${booking.timeSlot}`,
      ``,
      `*💳 Payment:* ₹${booking.amount} — Verified ✅`,
      `*Order ID:* ${booking.orderId}`,
      ``,
      `_This confirmation was generated by the Aadhya booking system._`,
    ].join('\n');
    // Normalize phone: strip non-digits, then ensure country code prefix
    let p = adminPhone.replace(/[^\d]/g, '');
    if (p.length === 10) p = '91' + p;  // India 10-digit → prepend 91
    // Use wa.me (modern, cross-platform) instead of api.whatsapp.com/send
    return `https://wa.me/${p}?text=${encodeURIComponent(msg)}`;
  };

  const handleDeleteBooking = async (id: string) => {
    try {
      const res = await fetchAdmin(`/api/bookings/${id}`, { method: 'DELETE' });
      if (res.ok) { fetchBookings(); fetchStats(); setSelectedBooking(null); }
    } catch (e) { console.error(e); }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const res = await fetchAdmin(`/api/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const data = await res.json();
        setAdminBookings(prev => prev.map(b => b.id === id ? data.booking : b));
        setSelectedBooking(prev => prev?.id === id ? data.booking : prev);
        fetchStats();
      }
    } catch (e) { console.error(e); }
  };

  const resetAllBookings = async () => {
    if (!confirm('Clear ALL bookings? This is irreversible!')) return;
    await fetchAdmin('/api/bookings/reset', { method: 'POST' });
    fetchBookings(); fetchStats();
  };

  // ── Event Management (Admin) ───────────────────────────────
  const handleAddEvent = async () => {
    setEventError(''); setEventSuccess('');
    if (!newEventName.trim() || !newEventDesc.trim() || !newEventAddress.trim() || !newEventStartDate || !newEventEndDate || !newEventTimeSlots.trim()) {
      setEventError('All fields are required.');
      return;
    }
    const slots = newEventTimeSlots.split(',').map(s => s.trim()).filter(s => s);
    if (slots.length === 0) {
      setEventError('At least one time slot is required.');
      return;
    }
    setEventSaving(true);
    try {
      const res = await fetchAdmin('/api/config/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: newEventName.trim(), 
          desc: newEventDesc.trim(), 
          address: newEventAddress.trim(),
          startDate: newEventStartDate,
          endDate: newEventEndDate,
          timeSlots: slots
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEvents(data.config.events);
        setNewEventName(''); setNewEventDesc(''); setNewEventAddress('');
        setNewEventStartDate(''); setNewEventEndDate(''); setNewEventTimeSlots('');
        setEventSuccess(`"${newEventName.trim()}" added successfully!`);
        setTimeout(() => setEventSuccess(''), 3000);
      } else {
        setEventError(data.message || 'Failed to add event.');
      }
    } catch (e: any) {
      setEventError('Network error: ' + e.message);
    } finally {
      setEventSaving(false);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm(`Remove event? Existing bookings for this event will remain.`)) return;
    try {
      const res = await fetchAdmin(`/api/config/events/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setEvents(data.config.events);
        if (selectedEventId === id && data.config.events.length > 0) {
          setSelectedEventId(data.config.events[0].id);
        } else if (data.config.events.length === 0) {
          setSelectedEventId('');
        }
      } else {
        alert(data.message || 'Failed to delete event.');
      }
    } catch (e: any) {
      alert('Network error: ' + e.message);
    }
  };

  const handleToggleEventsPaused = async () => {
    setEventSaving(true);
    const newPausedState = !eventsPaused;
    try {
      const res = await fetchAdmin('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventsPaused: newPausedState }),
      });
      const data = await res.json();
      if (data.success) {
        setEventsPaused(data.config.eventsPaused);
        setEventSuccess(newPausedState ? 'Events paused successfully.' : 'Events resumed successfully.');
        setTimeout(() => setEventSuccess(''), 3000);
      } else {
        alert(data.message || 'Failed to toggle events paused.');
      }
    } catch (e: any) {
      alert('Network error: ' + e.message);
    } finally {
      setEventSaving(false);
    }
  };

  // ── Filtered & Sorted Bookings ─────────────────────────────────────────
  const filteredBookings = adminBookings
    .filter(b => {
      const q = adminSearch.toLowerCase();
      const matchSearch = !q ||
        b.customerName.toLowerCase().includes(q) ||
        b.customerPhone.includes(q) ||
        b.customerEmail.toLowerCase().includes(q) ||
        b.location.toLowerCase().includes(q) ||
        b.id.toLowerCase().includes(q);
      const matchLoc    = filterLocation === 'All' || b.location === filterLocation;
      const matchStatus = filterStatus   === 'All' || b.status   === filterStatus;
      const matchDate   = !filterDate || b.date === filterDate;
      return matchSearch && matchLoc && matchStatus && matchDate;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'date')   cmp = a.date.localeCompare(b.date);
      if (sortBy === 'name')   cmp = a.customerName.localeCompare(b.customerName);
      if (sortBy === 'amount') cmp = a.amount - b.amount;
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('desc'); }
  };

  // ────────────────────────────────────────────────────────────────────────
  // Admin panel — PIN gate
  if (activeTab === 'admin' && !adminAuthenticated) {
    return <AdminPinScreen onSuccess={() => setAdminAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#fdfbf7] selection:bg-[#8f501c]/20 selection:text-[#8f501c] overflow-x-hidden">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-[#fdfbf7]/90 backdrop-blur-md border-b border-[#8f501c]/10 shadow-sm">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
            <AadhyaLogo className="w-9 h-9 flex-shrink-0" />
            <div className="hidden sm:block">
              <span className="text-xl font-bold tracking-wide uppercase text-[#2b2520] block">Aadhya</span>
              <span className="text-[10px] tracking-[0.2em] uppercase text-[#8f501c] font-semibold block -mt-1">Wellness Sanctuary</span>
            </div>
            <div className="sm:hidden">
              <span className="text-base font-bold tracking-wide uppercase text-[#2b2520] block leading-tight">Aadhya</span>
              <span className="text-[9px] tracking-widest uppercase text-[#8f501c] font-semibold block">Wellness</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              id="tab-booking"
              onClick={() => setActiveTab('booking')}
              className={`px-3 sm:px-4 py-1.5 rounded-full text-[10px] sm:text-xs font-semibold tracking-wider transition-all uppercase inline-flex items-center justify-center whitespace-nowrap ${
                activeTab === 'booking' ? 'bg-[#8f501c] text-[#fdfbf7] shadow-md' : 'text-[#2b2520]/70 hover:text-[#2b2520] hover:bg-[#8f501c]/5'
              }`}
            >
              <span className="hidden sm:inline">Book Program</span>
              <span className="sm:hidden">Book</span>
            </button>
            <button
              id="tab-admin"
              onClick={() => setActiveTab('admin')}
              className={`px-3 sm:px-4 py-1.5 rounded-full text-[10px] sm:text-xs font-semibold tracking-wider transition-all uppercase inline-flex items-center justify-center gap-1.5 whitespace-nowrap ${
                activeTab === 'admin' ? 'bg-[#8f501c] text-[#fdfbf7] shadow-md' : 'text-[#2b2520]/70 hover:text-[#2b2520] hover:bg-[#8f501c]/5'
              }`}
            >
              <Lock className="w-3 h-3" />
              <span className="hidden sm:inline">Admin Portal</span>
              <span className="sm:hidden">Admin</span>
            </button>
            {activeTab === 'admin' && adminAuthenticated && (
              <button
                onClick={() => { setAdminAuthenticated(false); setActiveTab('booking'); }}
                className="p-1.5 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all flex-shrink-0"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <main className="flex-grow max-w-6xl mx-auto px-3 sm:px-6 py-6 sm:py-8 w-full min-w-0">

        {/* ══════════ BOOKING TAB ══════════ */}
        {activeTab === 'booking' && (
          <div>
            {!currentBooking ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                {/* ── Left: Info ─────────────────────────────────────── */}
                <div className="lg:col-span-5 space-y-6">
                  <div className="bg-[#8f501c]/5 border border-[#8f501c]/10 rounded-2xl p-6 sm:p-8 relative overflow-hidden animate-fade-in">
                    <div className="absolute -right-16 -bottom-16 opacity-10 animate-spin-slow pointer-events-none">
                      <AadhyaLogo className="w-64 h-64" />
                    </div>

                    <span className="inline-block bg-[#8f501c]/10 text-[#8f501c] text-[10px] tracking-widest uppercase px-3 py-1 rounded-full font-bold mb-4">
                      Signature Experience
                    </span>
                    <h2 className="text-3xl font-bold text-[#2b2520] leading-tight mb-2">Ice Immersion</h2>
                    <p className="text-sm text-[#2b2520]/80 italic mb-6 leading-relaxed">
                      "Aadhya is a sanctuary of calm. A space where the body, mind, and soul come into harmony."
                    </p>

                    <div className="space-y-4">
                      {[
                        { icon: <Activity className="w-4 h-4" />, title: 'Cold Shock Therapy', desc: 'Controlled 4°C–8°C water plunge to release norepinephrine and activate natural resilience.' },
                        { icon: <Coffee className="w-4 h-4" />,  title: 'Guided Breathwork & Tea', desc: '10-minute preparation breathwork + warm organic herbal tea post-plunge.' },
                        { icon: <Clock className="w-4 h-4" />,   title: 'Daily: 10 AM – 3 PM', desc: 'Private 1-on-1 certified guidance for optimal safety and full breath control.' },
                      ].map(({ icon, title, desc }) => (
                        <div key={title} className="flex items-start gap-3">
                          <div className="bg-[#8f501c] text-[#fdfbf7] p-2 rounded-lg mt-0.5">{icon}</div>
                          <div>
                            <h4 className="text-sm font-semibold text-[#2b2520]">{title}</h4>
                            <p className="text-xs text-[#2b2520]/70">{desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-8 pt-6 border-t border-[#8f501c]/10 flex justify-between items-center">
                      <div>
                        <span className="text-xs text-[#2b2520]/60 block uppercase font-medium">Session Fee</span>
                        <span className="text-2xl font-bold text-[#2b2520]">₹1,499</span>
                        <span className="text-[10px] text-emerald-600 block font-semibold">✓ All Inclusive</span>
                      </div>
                      <div className="bg-emerald-500/10 text-emerald-700 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 border border-emerald-500/20">
                        <Sparkles className="w-3.5 h-3.5" />
                        Private Session
                      </div>
                    </div>
                  </div>

                  {/* Booking Summary Sidebar (live) — hidden on mobile */}
                  <div className="hidden lg:block bg-white border border-gray-100 rounded-2xl p-5 shadow-sm animate-slide-up animate-delay-200">
                    <h4 className="text-xs uppercase font-bold tracking-wider text-[#8f501c] mb-4 flex items-center gap-1.5">
                      <CalendarCheck className="w-4 h-4" />
                      Your Booking Summary
                    </h4>
                    <div className="space-y-2.5">
                      {[
                        { label: 'Event',  value: selectedEventId ? events.find(e => e.id === selectedEventId)?.name : '—' },
                        { label: 'Date',      value: selectedDate ? formatDate(selectedDate) : '—' },
                        { label: 'Time Slot', value: selectedTimeSlot || '—' },
                        { label: 'Session Fee', value: '₹1,499 (All Inclusive)' },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex items-center justify-between text-xs">
                          <span className="text-gray-400">{label}</span>
                          <span className={`font-semibold ${value === '—' ? 'text-gray-300' : 'text-[#2b2520]'}`}>{value}</span>
                        </div>
                      ))}
                    </div>
                    {selectedEventId && selectedDate && selectedTimeSlot && (
                      <div className="mt-4 pt-4 border-t border-gray-100 text-center animate-fade-in">
                        <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider flex items-center justify-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Ready to Book
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Safety Card */}
                  <div className="bg-[#fdfbf7] border border-[#2b2520]/5 rounded-2xl p-6 animate-slide-up animate-delay-300">
                    <h3 className="text-xs uppercase tracking-wider text-[#8f501c] font-bold flex items-center gap-1.5 mb-2">
                      <ShieldAlert className="w-4 h-4" />
                      Safety First Always
                    </h3>
                    <p className="text-xs text-[#2b2520]/70 leading-relaxed">
                      Ice baths prompt a strong vagal and cardiovascular reflex. All immersions are supervised 1-on-1. Do not book if you have cardiac arrhythmias, epilepsy, or severe cold allergies.
                    </p>
                  </div>
                </div>

                {/* ── Right: Form ────────────────────────────────────── */}
                <div className="lg:col-span-7 bg-white rounded-3xl border border-[#2b2520]/10 p-6 sm:p-8 shadow-sm animate-slide-up">
                  {eventsPaused ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-16">
                      <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mb-4">
                        <CalendarIcon className="w-8 h-8 text-amber-500" />
                      </div>
                      <h3 className="text-xl font-bold text-[#2b2520] mb-2">Events Currently Paused</h3>
                      <p className="text-sm text-gray-500 max-w-sm">
                        We are not accepting new bookings at this moment. Please check back later or contact us for more information.
                      </p>
                    </div>
                  ) : (
                    <>
                      <h3 className="text-lg font-semibold text-[#2b2520] mb-6 flex items-center gap-2 pb-3 border-b border-gray-100">
                        <span className="bg-[#8f501c]/10 text-[#8f501c] w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                        Configure Booking Details
                      </h3>

                      <form onSubmit={handleBookingSubmit} className="space-y-6">

                    {/* Event Selection */}
                    <div>
                      <label className="text-xs uppercase tracking-wider text-[#2b2520]/70 font-semibold mb-3 block">Select Event</label>
                      <div className="grid grid-cols-1 gap-3">
                        {events.map(evt => (
                          <button
                            key={evt.id}
                            type="button"
                            onClick={() => setSelectedEventId(evt.id)}
                            className={`p-4 rounded-xl text-left border transition-all cursor-pointer flex flex-col relative card-lift ${
                              selectedEventId === evt.id
                                ? 'border-[#8f501c] bg-[#8f501c]/5 ring-2 ring-[#8f501c]/20'
                                : 'border-[#2b2520]/10 hover:border-[#8f501c]/50 bg-[#fdfbf7]/50'
                            }`}
                          >
                            <span className="font-bold text-[#2b2520] text-sm flex items-center gap-1.5">
                              <MapPin className={`w-4 h-4 ${selectedEventId === evt.id ? 'text-[#8f501c]' : 'text-gray-400'}`} />
                              {evt.name}
                            </span>
                            <span className="text-xs text-[#2b2520]/60 mt-1">{evt.desc} • {evt.address}</span>
                            <span className="text-[10px] text-[#8f501c] mt-1 flex items-center gap-1">
                              <CalendarIcon className="w-3 h-3"/> {evt.startDate} to {evt.endDate}
                            </span>
                            {selectedEventId === evt.id && (
                              <span className="absolute top-3 right-3 bg-[#8f501c] text-[#fdfbf7] p-0.5 rounded-full">
                                <Check className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Date */}
                    <div>
                      <label className="text-xs uppercase tracking-wider text-[#2b2520]/70 font-semibold mb-3 block">Select Date</label>
                      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none snap-x">
                        {nextDays.map(day => (
                          <button
                            key={day.raw}
                            type="button"
                            onClick={() => setSelectedDate(day.raw)}
                            className={`flex flex-col items-center p-3 rounded-xl min-w-[64px] flex-shrink-0 text-center border snap-start cursor-pointer transition-all ${
                              selectedDate === day.raw
                                ? 'border-[#8f501c] bg-[#8f501c] text-[#fdfbf7] shadow-sm scale-[1.03]'
                                : 'border-gray-200 bg-[#fdfbf7]/30 hover:border-[#8f501c]/50'
                            }`}
                          >
                            <span className={`text-[9px] uppercase ${selectedDate === day.raw ? 'text-orange-200' : 'text-gray-400'}`}>{day.dayName}</span>
                            <span className="text-lg font-bold block my-0.5">{day.dayNum}</span>
                            <span className={`text-[9px] ${selectedDate === day.raw ? 'text-orange-200' : 'text-gray-500'}`}>{day.month}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Time Slots */}
                    <div>
                      <label className="text-xs uppercase tracking-wider text-[#2b2520]/70 font-semibold mb-3 block">Available Private Slots</label>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {(events.find(e => e.id === selectedEventId)?.timeSlots || []).map(slot => (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => setSelectedTimeSlot(slot)}
                            className={`py-2 px-1 text-center rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                              selectedTimeSlot === slot
                                ? 'bg-[#8f501c] border-[#8f501c] text-[#fdfbf7] font-bold scale-[1.05] shadow-sm'
                                : 'border-gray-200 hover:border-[#8f501c]/40 text-gray-700 bg-white'
                            }`}
                          >
                            {slot}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Personal Details */}
                    <div className="pt-4 border-t border-gray-100">
                      <h3 className="text-lg font-semibold text-[#2b2520] mb-4 flex items-center gap-2">
                        <span className="bg-[#8f501c]/10 text-[#8f501c] w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                        Guest Details
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-medium text-gray-600 block mb-1">Full Name</label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <User className="w-4 h-4 text-gray-400" />
                            </div>
                            <input type="text" value={name} onChange={e => setName(e.target.value)}
                              placeholder="Kailas Kumar"
                              className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#8f501c] focus:bg-white transition-all text-gray-800"
                              required />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600 block mb-1">Email Address</label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <Mail className="w-4 h-4 text-gray-400" />
                            </div>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                              placeholder="kailas@example.com"
                              className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#8f501c] focus:bg-white transition-all text-gray-800"
                              required />
                          </div>
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-xs font-medium text-gray-600 block mb-1">WhatsApp / Phone Number</label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <Phone className="w-4 h-4 text-gray-400" />
                            </div>
                            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                              placeholder="9876543210 (India)"
                              className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#8f501c] focus:bg-white transition-all text-gray-800"
                              required />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Medical Waiver */}
                    <div className="bg-[#8f501c]/5 p-4 rounded-2xl border border-[#8f501c]/10">
                      <h4 className="text-xs font-bold text-[#8f501c] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4" />
                        Medical Safety Self-Declaration
                      </h4>
                      <div className="space-y-3">
                        {[
                          { state: cardiacOk, set: setCardiacOk, label: 'I declare I have no severe cardiac complications, chronic respiratory issues, history of epilepsy, or cold allergies.' },
                          { state: pregnancyOk, set: setPregnancyOk, label: 'I declare I am not pregnant or attempting to conceive.' },
                          { state: liabilityAgreed, set: setLiabilityAgreed, label: 'I understand and agree to assume full responsibility for this cold plunge and will adhere 100% to the guidelines of my supervising practitioner.', bold: true },
                        ].map(({ state, set, label, bold }) => (
                          <label key={label} className="flex items-start gap-3 cursor-pointer">
                            <input type="checkbox" checked={state} onChange={e => set(e.target.checked)} className="custom-checkbox mt-0.5" />
                            <span className={`text-xs text-[#2b2520]/80 leading-relaxed ${bold ? 'font-semibold' : ''}`}>{label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Error */}
                    {errorMessage && (
                      <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs flex items-center gap-2 border border-red-200 animate-slide-down">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span>{errorMessage}</span>
                      </div>
                    )}

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={isLoading}
                      id="btn-book-submit"
                      className="w-full bg-[#8f501c] text-[#fdfbf7] py-3.5 rounded-xl font-bold text-sm tracking-wider uppercase shadow-md hover:bg-[#784114] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed"
                    >
                      {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Processing Order...</> : <>Book & Pay with Razorpay (₹{programPrice})<ArrowRight className="w-4 h-4" /></>}
                    </button>
                  </form>
                  </>
                )}
                </div>
              </div>
            ) : (
              /* ── Booking Success ─────────────────────────────────── */
              <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-gray-100 p-8 text-center shadow-lg animate-scale-in">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-float">
                  <CheckCircle2 className="w-12 h-12" />
                </div>

                <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-600 block mb-1">Payment Verified Successful</span>
                <h2 className="text-2xl font-bold text-[#2b2520] mb-2">Session Booked at Aadhya {currentBooking.location}!</h2>
                <p className="text-sm text-gray-500 mb-6">Thank you, <strong>{currentBooking.customerName}</strong>. Your ice immersion spot is locked in.</p>

                <div className="bg-[#fdfbf7] border border-[#8f501c]/10 rounded-2xl p-6 mb-6 text-left space-y-3">
                  <h4 className="text-xs uppercase tracking-wider font-bold text-[#8f501c] border-b border-[#8f501c]/10 pb-2 flex items-center gap-1.5">
                    <Star className="w-4 h-4" />
                    Official Appointment Receipt
                  </h4>
                  <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs text-[#2b2520]">
                    {[
                      { label: 'Location', value: `Aadhya ${currentBooking.location} Sanctuary` },
                      { label: 'Waiver Signed', value: 'Yes, Cleared ✓', green: true },
                      { label: 'Date', value: formatDate(currentBooking.date) },
                      { label: 'Time Slot', value: currentBooking.timeSlot },
                      { label: 'Amount Paid', value: `₹${currentBooking.amount} (INR)`, brand: true },
                      { label: 'Status', value: currentBooking.status },
                    ].map(({ label, value, green, brand }) => (
                      <div key={label}>
                        <span className="text-gray-400 block font-medium">{label}</span>
                        <span className={`font-bold ${green ? 'text-emerald-600' : brand ? 'text-[#8f501c]' : ''}`}>{value}</span>
                      </div>
                    ))}
                    <div className="col-span-2">
                      <span className="text-gray-400 block font-medium">Booking Reference</span>
                      <span className="font-mono bg-orange-50 px-2 py-0.5 rounded text-[10px]">{currentBooking.id}</span>
                    </div>
                  </div>
                </div>

                {/* WhatsApp */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-left mb-6">
                  <h3 className="font-bold text-emerald-800 text-sm flex items-center gap-1.5 mb-1">
                    <MessageSquare className="w-4 h-4 text-emerald-600" />
                    Notify Admin via WhatsApp
                  </h3>
                  <p className="text-xs text-emerald-700/80 mb-3">Send the full booking confirmation with all details to the admin's WhatsApp instantly.</p>
                  {/* Phone input with proper addon group */}
                  <div className="flex rounded-xl overflow-hidden border border-emerald-200 h-10 mb-3 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-200 transition-all">
                    <span className="bg-emerald-100 text-emerald-800 text-xs px-3 flex items-center font-bold border-r border-emerald-200 whitespace-nowrap select-none">+</span>
                    <input
                      type="tel"
                      value={adminPhone}
                      onChange={e => setAdminPhone(e.target.value)}
                      placeholder="919876543210"
                      className="bg-white text-emerald-900 px-3 h-full text-xs font-bold focus:outline-none flex-grow min-w-0"
                    />
                  </div>
                  <p className="text-[10px] text-emerald-600/70 mb-3">Enter phone with country code (e.g. 919876543210 for India). No +, spaces, or dashes.</p>
                  <a
                    href={getWhatsAppLink(currentBooking)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-[#25D366] text-white py-3 rounded-xl font-bold text-xs tracking-wider uppercase shadow hover:bg-[#1ebe5d] transition-all flex items-center justify-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Open WhatsApp with Booking Details
                  </a>
                </div>

                <button onClick={() => setCurrentBooking(null)} className="text-[#8f501c] font-semibold text-xs tracking-wide uppercase hover:underline">
                  ← Book Another Session
                </button>
              </div>
            )}
          </div>
        )}

        {/* ══════════ ADMIN TAB ══════════ */}
        {activeTab === 'admin' && adminAuthenticated && (
          <div className="animate-fade-in">

            {/* Admin Header */}
            <div className="glass-dark rounded-2xl p-4 sm:p-5 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#8f501c] flex items-center justify-center flex-shrink-0 animate-pulse-ring">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-white font-bold text-base sm:text-lg leading-tight">Aadhya Admin Portal</h2>
                  <p className="text-gray-400 text-xs">Real-time booking management dashboard</p>
                </div>
              </div>
              {/* Admin Sub-Nav — full width on mobile */}
              <div className="flex gap-1 bg-white/10 rounded-xl p-1 w-full sm:w-auto sm:inline-flex">
                {(['dashboard','bookings','settings'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setAdminActiveTab(t)}
                    className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-semibold capitalize transition-all text-center min-w-[80px] ${
                      adminActiveTab === t ? 'bg-[#8f501c] text-white' : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Dashboard Sub-Tab ──────────────────────────────────── */}
            {adminActiveTab === 'dashboard' && (
              <div className="space-y-6">

                {/* Stat Cards */}
                {statsLoading ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                        <div className="shimmer h-8 w-20 rounded-lg mb-3" />
                        <div className="shimmer h-6 w-16 rounded-lg mb-1" />
                        <div className="shimmer h-3 w-24 rounded" />
                      </div>
                    ))}
                  </div>
                ) : adminStats ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard icon={<Users className="w-5 h-5" />} label="Total Bookings" value={adminStats.total} sub="All time" delay={0} />
                    <StatCard icon={<DollarSign className="w-5 h-5" />} label="Total Revenue" value={`₹${adminStats.totalRevenue.toLocaleString('en-IN')}`} sub="INR collected" color="#059669" delay={0.1} />
                    <StatCard icon={<CalendarCheck className="w-5 h-5" />} label="Today's Sessions" value={adminStats.todayCount} sub="Scheduled today" color="#0284c7" delay={0.2} />
                    <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Upcoming" value={adminStats.upcomingCount} sub="Future bookings" color="#7c3aed" delay={0.3} />
                  </div>
                ) : (
                  <button onClick={fetchStats} className="text-xs text-[#8f501c] underline">Load Stats</button>
                )}

                {/* Chart + Location Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Bar Chart */}
                  <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm animate-slide-up animate-delay-400">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-semibold text-[#2b2520] flex items-center gap-1.5">
                        <BarChart2 className="w-4 h-4 text-[#8f501c]" />
                        Bookings — Last 7 Days
                      </h4>
                      <button onClick={() => { fetchBookings(); fetchStats(); }} className="text-gray-400 hover:text-[#8f501c] transition-colors">
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </div>
                    {adminStats ? (
                      <MiniBarChart data={adminStats.bookingsByDay} />
                    ) : (
                      <div className="shimmer h-20 rounded-xl" />
                    )}
                  </div>

                  {/* Location Breakdown */}
                  <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm animate-slide-up animate-delay-500">
                    <h4 className="text-sm font-semibold text-[#2b2520] flex items-center gap-1.5 mb-4">
                      <MapPin className="w-4 h-4 text-[#8f501c]" />
                      By Location
                    </h4>
                    {adminStats ? (
                      <div className="space-y-3">
                        {events.map(evt => {
                          const count = adminStats.byLocation[evt.name] || 0;
                          const total = adminStats.total || 1;
                          const pct = Math.round((count / total) * 100);
                          return (
                            <div key={evt.id}>
                              <div className="flex justify-between text-xs mb-1">
                                <span className="font-semibold text-[#2b2520]">{evt.name}</span>
                                <span className="text-gray-400">{count} sessions ({pct}%)</span>
                              </div>
                              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-2 rounded-full chart-bar"
                                  style={{ width: `${pct}%`, background: BRAND }}
                                />
                              </div>
                            </div>
                          );
                        })}
                        {Object.keys(adminStats.byLocation).length === 0 && (
                          <p className="text-xs text-gray-400 text-center py-4">No data yet</p>
                        )}
                      </div>
                    ) : (
                      <div className="shimmer h-20 rounded-xl" />
                    )}
                  </div>
                </div>

                {/* Recent Bookings Quick View */}
                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm animate-slide-up">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-semibold text-[#2b2520]">Recent Bookings</h4>
                    <button onClick={() => setAdminActiveTab('bookings')} className="text-xs text-[#8f501c] font-semibold hover:underline flex items-center gap-1">
                      View All <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {adminBookings.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-6">No bookings yet</p>
                  ) : (
                    <div className="space-y-2">
                      {adminBookings.slice(0, 5).map(b => (
                        <div key={b.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setSelectedBooking(b)}>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#8f501c]/10 flex items-center justify-center text-[#8f501c] font-bold text-xs">
                              {b.customerName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <span className="text-xs font-semibold text-[#2b2520] block">{b.customerName}</span>
                              <span className="text-[10px] text-gray-400">{formatDate(b.date)} · {b.timeSlot}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#8f501c]">₹{b.amount}</span>
                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${getStatusClass(b.status)}`}>{b.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Bookings Sub-Tab ───────────────────────────────────── */}
            {adminActiveTab === 'bookings' && (
              <div className="space-y-4 animate-fade-in">
                {/* Toolbar */}
                <div className="bg-white rounded-2xl border border-gray-100 p-3 sm:p-4 shadow-sm">
                  <div className="flex flex-col gap-3">
                    {/* Search */}
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="w-4 h-4 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        placeholder="Search name, phone, email..."
                        value={adminSearch}
                        onChange={e => setAdminSearch(e.target.value)}
                        className="w-full pl-9 pr-3 h-10 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-[#8f501c] transition-all"
                      />
                    </div>

                    {/* Filters row */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <select value={filterLocation} onChange={e => setFilterLocation(e.target.value)}
                        className="bg-gray-50 border border-gray-200 rounded-xl px-2 sm:px-3 h-10 text-xs focus:outline-none focus:border-[#8f501c] w-full">
                        <option value="All">All Locations</option>
                        {events.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
                      </select>
                      <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                        className="bg-gray-50 border border-gray-200 rounded-xl px-2 sm:px-3 h-10 text-xs focus:outline-none focus:border-[#8f501c] w-full">
                        <option value="All">All Statuses</option>
                        {['Paid','Attended','Cancelled','No-Show'].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
                        className="col-span-2 sm:col-span-1 bg-gray-50 border border-gray-200 rounded-xl px-2 sm:px-3 h-10 text-xs focus:outline-none focus:border-[#8f501c] w-full" />
                    </div>

                    {/* Actions row */}
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => { fetchBookings(); fetchStats(); }}
                        className="bg-gray-100 hover:bg-gray-200 w-10 h-10 rounded-xl text-gray-600 transition-all flex items-center justify-center flex-shrink-0" title="Refresh">
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      <button onClick={() => exportCSV(filteredBookings)}
                        className="bg-[#8f501c]/10 hover:bg-[#8f501c]/20 text-[#8f501c] px-4 h-10 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all flex-1 justify-center sm:flex-none">
                        <Download className="w-3.5 h-3.5" />
                        Export CSV
                      </button>
                      <button onClick={resetAllBookings}
                        className="bg-red-50 hover:bg-red-100 text-red-600 px-4 h-10 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all flex-1 justify-center sm:flex-none">
                        <Trash2 className="w-3.5 h-3.5" />
                        Clear All
                      </button>
                    </div>
                  </div>

                  {/* Active filters summary */}
                  <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100">
                    <span className="text-[10px] text-gray-400 uppercase font-bold">Showing:</span>
                    <span className="text-xs font-semibold text-[#2b2520]">{filteredBookings.length} booking(s)</span>
                    {(filterLocation !== 'All' || filterStatus !== 'All' || filterDate || adminSearch) && (
                      <button onClick={() => { setFilterLocation('All'); setFilterStatus('All'); setFilterDate(''); setAdminSearch(''); }}
                        className="text-[10px] text-red-500 hover:underline ml-auto">
                        Clear Filters
                      </button>
                    )}
                  </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  {bookingsLoading ? (
                    <div className="p-8 space-y-3">
                      {[...Array(4)].map((_, i) => <div key={i} className="shimmer h-12 rounded-xl" />)}
                    </div>
                  ) : filteredBookings.length === 0 ? (
                    <div className="text-center py-16 border-2 border-dashed border-gray-100 m-4 rounded-2xl">
                      <Database className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                      <h4 className="text-sm font-semibold text-gray-400 mb-1">No bookings found</h4>
                      <p className="text-xs text-gray-300">Try adjusting your search or filter criteria</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto scrollbar-thin">
                      <table className="w-full text-left text-xs text-gray-500 min-w-[720px]">
                        <thead className="bg-gray-50 text-[#2b2520] font-semibold uppercase tracking-wider text-[10px] border-b border-gray-100">
                          <tr>
                            <th className="py-3 px-4 align-middle">Guest</th>
                            <th className="py-3 px-4 align-middle">Location</th>
                            <th className="py-3 px-4 align-middle cursor-pointer select-none hover:text-[#8f501c]" onClick={() => toggleSort('date')}>
                              <span className="flex items-center gap-1">Date / Time <ChevronDown className={`w-3 h-3 transition-transform ${sortBy==='date' && sortDir==='asc' ? 'rotate-180' : ''}`} /></span>
                            </th>
                            <th className="py-3 px-4 align-middle cursor-pointer select-none hover:text-[#8f501c]" onClick={() => toggleSort('amount')}>
                              <span className="flex items-center gap-1">Amount <ChevronDown className={`w-3 h-3 transition-transform ${sortBy==='amount' && sortDir==='asc' ? 'rotate-180' : ''}`} /></span>
                            </th>
                            <th className="py-3 px-4 align-middle">Status</th>
                            <th className="py-3 px-4 align-middle text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {filteredBookings.map((b, idx) => (
                            <tr key={b.id} className="hover:bg-[#fdfbf7] transition-colors" style={{ animationDelay: `${idx * 0.03}s` }}>
                              <td className="py-3 px-4 align-middle">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-full bg-[#8f501c]/10 flex items-center justify-center text-[#8f501c] font-bold text-xs flex-shrink-0">
                                    {b.customerName.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <span className="font-bold text-[#2b2520] block">{b.customerName}</span>
                                    <span className="text-[10px] text-gray-400">{b.customerPhone}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4 align-middle">
                                <span className="bg-[#8f501c]/10 text-[#8f501c] px-2 py-0.5 rounded font-bold text-[10px]">
                                  {b.location}
                                </span>
                              </td>
                              <td className="py-3 px-4 align-middle">
                                <span className="font-medium text-gray-700 block">{formatDate(b.date)}</span>
                                <span className="text-[10px] text-gray-400">{b.timeSlot}</span>
                              </td>
                              <td className="py-3 px-4 font-bold text-[#8f501c] align-middle">₹{b.amount}</td>
                              <td className="py-3 px-4 align-middle">
                                <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase inline-flex items-center gap-1 ${getStatusClass(b.status)}`}>
                                  {b.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right align-middle">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => setSelectedBooking(b)}
                                    className="p-1.5 rounded-lg bg-gray-100 hover:bg-[#8f501c]/10 text-gray-500 hover:text-[#8f501c] transition-all"
                                    title="View Details"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                  <a
                                    href={getWhatsAppLink(b)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition-all"
                                    title="Send WhatsApp"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                  </a>
                                  <button
                                    onClick={() => { if (confirm('Delete this booking?')) handleDeleteBooking(b.id); }}
                                    className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition-all"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Settings Sub-Tab ───────────────────────────────────── */}
            {adminActiveTab === 'settings' && (
              <div className="max-w-xl space-y-4 animate-fade-in">
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                  <h4 className="text-sm font-bold text-[#2b2520] mb-4 flex items-center gap-2">
                    <Settings className="w-4 h-4 text-[#8f501c]" />
                    WhatsApp Notifications
                  </h4>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Admin WhatsApp Number (with country code)</label>
                  <div className="flex gap-2 mb-2">
                    <span className="bg-gray-100 border border-gray-200 text-gray-600 text-xs w-10 h-10 rounded-xl flex items-center justify-center font-bold flex-shrink-0">+</span>
                    <input
                      type="text"
                      value={adminPhone}
                      onChange={e => setAdminPhone(e.target.value)}
                      placeholder="919876543210"
                      className="bg-gray-50 border border-gray-200 text-[#2b2520] rounded-xl px-3 h-10 text-xs font-bold focus:outline-none focus:border-[#8f501c] flex-grow"
                    />
                  </div>
                  <p className="text-[10px] text-gray-400">All WhatsApp booking confirmations will be sent to this number. Include country code (e.g., 91 for India).</p>
                </div>

                {/* Event Management */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                  <h4 className="text-sm font-bold text-[#2b2520] mb-4 flex items-center gap-2">
                    <CalendarCheck className="w-4 h-4 text-[#8f501c]" />
                    Event Management
                  </h4>
                  <p className="text-xs text-gray-500 mb-4">Manage the specific events, their dates, locations, and time slots.</p>

                  {/* Existing Events */}
                  <div className="space-y-3 mb-5">
                    {events.map(evt => (
                      <div key={evt.id} className="border border-gray-100 rounded-xl p-4 bg-gray-50/50">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <MapPin className="w-4 h-4 text-[#8f501c] flex-shrink-0" />
                              <span className="text-sm font-bold text-[#2b2520]">{evt.name}</span>
                            </div>
                            <p className="text-xs text-gray-500 mb-0.5">{evt.desc} • {evt.address}</p>
                            <p className="text-[10px] text-[#8f501c] font-bold mt-1">
                              <CalendarIcon className="w-3 h-3 inline-block mr-1" />
                              {evt.startDate} to {evt.endDate}
                            </p>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {evt.timeSlots.map(ts => (
                                <span key={ts} className="bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded text-[9px]">{ts}</span>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button
                              onClick={() => handleDeleteEvent(evt.id)}
                              className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition-all" title="Remove">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add New Event Form */}
                  <div className="border-2 border-dashed border-[#8f501c]/20 rounded-xl p-4 bg-[#8f501c]/[0.02]">
                    <h5 className="text-xs font-bold text-[#8f501c] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5" />
                      Add New Event
                    </h5>
                    <div className="space-y-2.5">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Event Name</label>
                        <input type="text" value={newEventName} onChange={e => setNewEventName(e.target.value)}
                          placeholder="e.g. Ice Immersion Workshop"
                          className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#8f501c] transition-all" />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Description</label>
                        <input type="text" value={newEventDesc} onChange={e => setNewEventDesc(e.target.value)}
                          placeholder="e.g. A guided 1-on-1 experience"
                          className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#8f501c] transition-all" />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Full Address</label>
                        <input type="text" value={newEventAddress} onChange={e => setNewEventAddress(e.target.value)}
                          placeholder="e.g. Panampilly Nagar, Ernakulam"
                          className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#8f501c] transition-all" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Start Date</label>
                          <input type="date" value={newEventStartDate} onChange={e => setNewEventStartDate(e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#8f501c] transition-all" />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">End Date</label>
                          <input type="date" value={newEventEndDate} onChange={e => setNewEventEndDate(e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#8f501c] transition-all" />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Time Slots (comma separated)</label>
                        <input type="text" value={newEventTimeSlots} onChange={e => setNewEventTimeSlots(e.target.value)}
                          placeholder="e.g. 10:00 AM, 11:00 AM, 12:00 PM"
                          className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#8f501c] transition-all" />
                      </div>
                      
                      {eventError && (
                        <div className="p-2 bg-red-50 text-red-600 rounded-lg text-xs flex items-center gap-1.5 border border-red-200">
                          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                          {eventError}
                        </div>
                      )}
                      {eventSuccess && (
                        <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg text-xs flex items-center gap-1.5 border border-emerald-200">
                          <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                          {eventSuccess}
                        </div>
                      )}
                      <button onClick={handleAddEvent} disabled={eventSaving}
                        className="w-full bg-[#8f501c] hover:bg-[#784114] text-white py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                        <Plus className="w-3.5 h-3.5" />
                        {eventSaving ? 'Adding...' : 'Add Event'}
                      </button>
                    </div>
                  </div>

                  {/* Pause Events Toggle */}
                  <div className="pt-4 border-t border-gray-100 mt-5">
                    <div className="flex items-center justify-between bg-amber-50/50 border border-amber-100 rounded-xl p-4">
                      <div>
                        <h5 className="text-sm font-bold text-[#2b2520] flex items-center gap-2 mb-1">
                          <ShieldAlert className="w-4 h-4 text-amber-500" />
                          Pause All Events
                        </h5>
                        <p className="text-[10px] text-gray-500">Temporarily hide the booking form and show a "currently paused" message to customers.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={eventsPaused} onChange={handleToggleEventsPaused} disabled={eventSaving} />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                      </label>
                    </div>
                  </div>

                  {/* Event feedback messages */}
                  {eventError && (
                    <div className="p-2 bg-red-50 text-red-600 rounded-lg text-xs flex items-center gap-1.5 border border-red-200 mt-4">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      {eventError}
                    </div>
                  )}
                  {eventSuccess && (
                    <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg text-xs flex items-center gap-1.5 border border-emerald-200 mt-4">
                      <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      {eventSuccess}
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                  <h4 className="text-sm font-bold text-[#2b2520] mb-4 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#8f501c]" />
                    Security
                  </h4>
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                    <p className="text-xs text-amber-800">
                      <strong>Admin PIN</strong> is currently set to <code className="bg-amber-100 px-1 rounded">1234</code>. To change it, update the <code className="bg-amber-100 px-1 rounded">ADMIN_PIN</code> constant in your code or configure via a server environment variable.
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                  <h4 className="text-sm font-bold text-[#2b2520] mb-4 flex items-center gap-2">
                    <Database className="w-4 h-4 text-[#8f501c]" />
                    Data Management
                  </h4>
                  <div className="flex gap-3">
                    <button onClick={() => exportCSV(adminBookings)}
                      className="flex-1 bg-[#8f501c]/10 hover:bg-[#8f501c]/20 text-[#8f501c] py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all">
                      <Download className="w-3.5 h-3.5" />
                      Export All Bookings CSV
                    </button>
                    <button onClick={resetAllBookings}
                      className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                      Reset All Data
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="bg-[#2b2520] text-[#fdfbf7]/80 py-8 mt-16 border-t border-gray-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <AadhyaLogo className="w-10 h-10" color="#fdfbf7" />
            <div>
              <span className="text-base font-bold tracking-wide uppercase text-white block">Aadhya Wellness</span>
              <span className="text-[9px] tracking-[0.15em] uppercase text-[#8f501c] font-semibold block">Mind · Body · Soul</span>
            </div>
          </div>
          <div className="text-center md:text-right text-xs space-y-1">
            <p>© 2026 Aadhya Wellness. All rights reserved.</p>
            <p className="text-gray-500">{events.map(e => `${e.name} Sanctuary · ${e.address.split(',')[0]}`).join(' | ')}</p>
          </div>
        </div>
      </footer>

      {/* ── Simulated Razorpay Payment Sheet ──────────────────────────────── */}
      {showSimModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl animate-slide-up border border-gray-100">
            <div className="bg-[#111] text-white p-5 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-orange-700/80 flex items-center justify-center font-bold text-sm text-white">A</div>
                <div>
                  <h4 className="text-sm font-bold tracking-wide">Aadhya Wellness</h4>
                  <span className="text-[9px] text-gray-400 block -mt-0.5">Razorpay Sandbox Simulator</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-gray-400 block">Total Amount</span>
                <span className="text-base font-bold text-white">₹{simulatedAmount}.00</span>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl">
                <h5 className="text-xs font-bold text-orange-800 uppercase tracking-wider flex items-center gap-1 mb-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  Sandbox Mode Active
                </h5>
                <p className="text-[11px] text-orange-700 leading-relaxed">
                  Razorpay credentials are in placeholder mode. Select a simulated payment outcome to test the full booking flow.
                </p>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Select Transaction Outcome</span>
                <button onClick={() => handleSimulatedPayment(true)}
                  className="w-full bg-[#111] hover:bg-black text-white p-4 rounded-xl flex items-center justify-between transition-all group cursor-pointer">
                  <div className="text-left">
                    <span className="text-xs font-bold block">Simulate Success</span>
                    <span className="text-[10px] text-gray-400 block">Create booking, verify, prefill WhatsApp</span>
                  </div>
                  <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center group-hover:scale-105 transition-all">
                    <Check className="w-4 h-4" />
                  </div>
                </button>
                <button onClick={() => handleSimulatedPayment(false)}
                  className="w-full bg-gray-50 hover:bg-gray-100 text-gray-800 p-4 rounded-xl flex items-center justify-between transition-all group cursor-pointer border border-gray-100">
                  <div className="text-left">
                    <span className="text-xs font-bold block text-gray-700">Simulate Failure</span>
                    <span className="text-[10px] text-gray-400 block">Cancel and return to scheduler</span>
                  </div>
                  <div className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center group-hover:scale-105 transition-all">
                    <X className="w-4 h-4" />
                  </div>
                </button>
              </div>

              <div className="text-center pt-1">
                <span className="text-[10px] text-gray-300 font-mono">Order: {simulatedOrderId}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Booking Detail Modal ───────────────────────────────────────────── */}
      {selectedBooking && (
        <BookingDetailModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onStatusChange={handleStatusChange}
          onDelete={handleDeleteBooking}
        />
      )}
    </div>
  );
}
