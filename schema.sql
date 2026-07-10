DROP TABLE IF EXISTS bookings;
CREATE TABLE bookings (
  id TEXT PRIMARY KEY,
  orderId TEXT,
  paymentId TEXT,
  location TEXT,
  date TEXT,
  timeSlot TEXT,
  customerName TEXT,
  customerEmail TEXT,
  customerPhone TEXT,
  amount REAL,
  status TEXT,
  medicalAgreed INTEGER,
  createdAt TEXT
);

DROP TABLE IF EXISTS key_value;
CREATE TABLE key_value (
  key TEXT PRIMARY KEY,
  value TEXT
);

INSERT INTO key_value (key, value) VALUES (
  'config', 
  '{"events":[{"id":"evt-calicut","name":"Ice Immersion Workshop","desc":"Beach Road Sanctuary, overlooking the Malabar coast.","address":"Near Beach Road, Calicut, Kerala","startDate":"2026-07-10","endDate":"2026-07-24","timeSlots":["10:00 AM","11:00 AM","12:00 PM","01:00 PM","02:00 PM","03:00 PM"]},{"id":"evt-ernakulam","name":"Ice Immersion Workshop","desc":"Panampilly Nagar Retreat, a calm boutique oasis.","address":"Panampilly Nagar, Ernakulam, Kerala","startDate":"2026-07-10","endDate":"2026-07-24","timeSlots":["10:00 AM","11:00 AM","12:00 PM","01:00 PM","02:00 PM","03:00 PM"]}],"eventsPaused":false}'
);
