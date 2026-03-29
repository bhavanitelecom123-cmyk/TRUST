-- Create Admin User
-- Run this AFTER running production-schema.sql

INSERT INTO users (id, email, password, role, "emailVerified", "createdAt", "createdBy")
VALUES (
  gen_random_uuid(),
  'admin@caste.com',
  '$2b$12$AyHzQPeHd3snI9IvMT74h.TxTqxr1HaEHW2LuhMBQ2lVFKR/Akc/C',
  'ADMIN',
  NOW(),
  NOW(),
  NULL
)
ON CONFLICT (email) DO UPDATE SET
  role = 'ADMIN',
  "emailVerified" = NOW(),
  password = EXCLUDED.password;
