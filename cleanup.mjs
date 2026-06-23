import { createClient } from '@libsql/client';

const client = createClient({
  url: 'libsql://alqalam-hassanlvsh8-star.aws-eu-west-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODIxMTIwODIsImlkIjoiMDE5ZWVlMjYtZDEwMS03MjRmLTk1MTYtYjc2OGRhOWU3ODlmIiwicmlkIjoiNzAzYzEzNWItYWQzNC00MzAxLTkyNDMtMTNiMTZjMzBiMWYzIn0.syobnk2HswdwKyGnWUbebxhSU-2bbpcQnwctI_Ew4F7ntAEk9El1SUg2j5pHDrbNik0ywEQoEp1uhZcQnDIfDA',
});

// Delete all attendance, push subs, students, and legacy classes
await client.execute('DELETE FROM attendance WHERE student_id IN (SELECT id FROM students)');
await client.execute('DELETE FROM push_subscriptions WHERE student_id IN (SELECT id FROM students)');
await client.execute('DELETE FROM students');
await client.execute("DELETE FROM classes WHERE name IN ('Class 5A','Class 6B','Class 7C')");

console.log('Done — all legacy students and classes deleted.');
process.exit(0);
