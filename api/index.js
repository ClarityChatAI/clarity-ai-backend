const express = require('express');
const admin = require('firebase-admin');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// Firebase initialization
const serviceAccount = {
  type: 'service_account',
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Constants
const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
const ONESIGNAL_API_KEY = process.env.ONESIGNAL_API_KEY;
const ONESIGNAL_API_URL = 'https://onesignal.com/api/v1/notifications';

// Helper: Send OneSignal notification
async function sendNotification(email, notificationType, name, goal) {
  try {
    const payload = {
      app_id: ONESIGNAL_APP_ID,
      contents: { en: `Hi ${name}, let's work on: ${goal}` },
    };

    if (notificationType === 'push' || notificationType === 'both') {
      payload.include_external_user_ids = [email];
    }
    if (notificationType === 'email' || notificationType === 'both') {
      payload.include_email_tokens = [email];
      payload.email_subject = 'Welcome to Clarity AI';
    }

    await axios.post(ONESIGNAL_API_URL, payload, {
      headers: { Authorization: `Basic ${ONESIGNAL_API_KEY}` },
    });

    console.log(`Notification sent to ${email} (${notificationType})`);
  } catch (error) {
    console.error('OneSignal error:', error.response?.data || error.message);
  }
}

// Endpoint: Save user and send notifications
app.post('/api/save-user', async (req, res) => {
  try {
    const { name, email, goal, notificationType, scores } = req.body;

    if (!name || !email || !goal) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Save to Firebase
    await db.collection('users').doc(email).set({
      name,
      email,
      goal,
      notificationType,
      scores,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Send notification
    if (notificationType !== 'none') {
      await sendNotification(email, notificationType, name, goal);
    }

    res.json({ success: true, message: 'User saved and notification sent' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint: Get user snapshot
app.get('/api/user/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const doc = await db.collection('users').doc(email).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(doc.data());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint: Update user
app.put('/api/user/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const { scores, goal, notificationType } = req.body;

    await db.collection('users').doc(email).update({
      scores,
      goal,
      notificationType,
      updatedAt: new Date(),
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
