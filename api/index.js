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
type: "service_account",
project_id: "clarity-ai-749a1",
private_key_id: "1fbe30029c2cfbcb670b89306407b756d8eb2bdf",
private_key: "-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDC8HcrVira5zF4
nqi7njfaXCtZgXKvdwDPhgkN6yqjQUJzmFXGe1mcyATkfxfFYu3dEmLFlHGNRSrL
u3vGKOmIDfdTG72/7UauzE5vJnZJ6t1cTXjf9z3x437BJkQP7k7XcszRpRg+Weei
n5aWMufdMzaus2LE/PP4rhImI8mbWHctAUokmW2A+ilZ6W2Yfit2nccrm/i5XA9R
md/h6DO3bRr3LyYdUIz+u/4SNnZvbjJyIbMa68ix7zgk51nIagboNe3YtKnfDDIq
8sJpKecCh+whS0zBcmPk8p6CuYjtMu8hyZByB0rPn991AbMiQq5s/ZL4M28Qk6AB
S1RvSWmlAgMBAAECggEAHuusB153VToLNY37Byl5RARPJvcatRzL7t7clE3bOUJ6
cyH0ZxN9OxpZ9lF3eIpw3tpR+vOJEGaqe17daujl4/wNISxbDHSrO8Ix5b0E0cQ0
gPXT6LiLpZDXc/UpIhrDfDacKNvGTOuPS5MDPIdOEl7Te2H+Vm8mFqmrvMt76M0Y
Sp+QSKlzcJfwvRPLKIW9Lfc2hXtqk23zCGqrMSD9iB75Uil9BdlSaTLyoI6T/Os2
qGPjPq4sgztyEMi7vexehD0N0fqvpp3OLhfy2pk6oWxjLStOUz1NPaKsSJUdFBwz
7ihXuPrE7UPg1JpOnslR11rbIcRmuRmHYPAR5BL1sQKBgQDouTr0xwEKw0lgXkyN
fJNQtJFTYTVk6tGO4oNHPGLrR/zUQFIV4VQafhqigJDUO8o1p5SpDYyRgPH4nDDD
KQhjNisAZO+RYS4QDCF2j+4hqIjIkclh5ufuF7eu7pD9G1Cgn0aD1eYW3NxgIkIR
Jg3NWGidjHRwuq+/NGmhawGttQKBgQDWb8nuZWb7b/QRtgX2uhvuMIUsIOQV6C09
1zX68U362j6ARpVFsMA/SnYa9GahpDwXi6Wxf9UWEiOm+Pj4BF3H22bAriDzJnZ0
OmJH3TJCZt6o+ukrvNHN0zEmFWB5trnpbuiWevU0Hq2A4AvwZOIvndiKZx8hRLNh
9jAbyYTCMQKBgQC27ImbxyRZimCNn/F6MNY2VIf6SulGNpCbSA46GwwBtebUCu66
hg+udzqGSpoMSCbL/7oJGz5HTFxltpdZf1I5cWVhfPUVh5ZGRNK0t7NMv4UsafMp
we7BpeDaXmiWmjbI2gj6LVIa3GVYJvVZN1kX9Are83y+8u6bUx5II60BFQKBgEi8
hoxczP/Ay9MuIPu9yTeUMbf0OCnOJXpyg5bpPwA2AzlTt9J5z9woD8O43w85PEDo
V33L1KW15W3/ycOnB4CBRWtaJUcU5t0p6KhjuWaYqjI7WdhCJhBg8KzwV1cxygIK
Ys6YSpAxT70FQkd6kNaB/i+EJyULvqUd8teaFXQhAoGBAI4PeJ/6WFO67ci2MGx3
wDnxWIM5NNbwzwd4JxDpmZwNvnoxtEkmuXod1y6Bu65vrkgli3edhByQiw8BOplf
ueccL4Yq/hyYPWZkDSpRUfyLDSuc5E3zoyB+LZDIYfGGZqE9EflgdhVCMD7YQ7CF
xvaWgaE6NGeDWjQFUUj2V1v5
-----END PRIVATE KEY-----",
client_email: "firebase-adminsdk-fbsvc@clarity-ai-749a1.iam.gserviceaccount.com",
client_id: "100447262029874910030",
auth_uri: "https://accounts.google.com/o/oauth2/auth",
token_uri: "https://oauth2.googleapis.com/token",
auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40clarity-ai-749a1.iam.gserviceaccount.com",
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
