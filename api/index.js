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
  project_id: 'clarity-ai-749a1',
  private_key_id: '1fbe30029c2cfbcb670b89306407b756d8eb2bdf',
  private_key: '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7VJTUt9Us8cKj\nMzEfYyjiWA4/4eFR2t+FmwMx7nHIcV08UVT/32DY11ZSRVF8yvkFlAMR0CHr00aw\n+RZAiGlg8tkjMIWu3vs+lEY+RF1F4W7u43YdHn26/48O7O7p2u+ZeImx62akE7ia\n3mHlWI7DkQvesF3UNqkxiub1dUfJ5Z7QVcDyvUw6putlD4xMCa0p8ZLnQXImd9P9\n2Z+2Z9sNrWBvUZnhCoYYoXocqJmj5ZfvWIIFFuauMFqWfxeDXsXijtrCHu8K+6Tz\nqx2LA3tcjuVaPJxMx2D+zlAYzEe5qGAHE7kM4+5KX9uTSVEUSuauvKxWNCeVMQKB\ngQDh6xF+A6LVk1QV5nXJBFwE4PvLwHdKqt4vJMqZJQsCuEpAMVILOA==\n-----END PRIVATE KEY-----\n',
  client_email: 'firebase-adminsdk-fbsvc@clarity-ai-749a1.iam.gserviceaccount.com',
  client_id: '100447262029874910030',
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
  client_x509_cert_url: 'https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40clarity-ai-749a1.iam.gserviceaccount.com',
};


admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Constants
const ONESIGNAL_APP_ID = 'f3a20c02-9852-410b-b29d-c586ff459e68';
const ONESIGNAL_API_KEY = '1dt7wqpb2e6bek1aoeqhghu7o';
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
