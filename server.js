const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
const helmet = require('helmet');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Initialize Firebase Admin SDK
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
};

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID
  });
  console.log('Firebase Admin SDK initialized successfully');
} catch (error) {
  console.error('Firebase Admin SDK initialization error:', error);
}

// In-memory storage for device tokens (in production, use a database)
let deviceTokens = new Set();
let userSubscriptions = new Map(); // userId -> Set of tokens

// Routes

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'FCM Push Notification Server'
  });
});

// Register device token
app.post('/register-token', (req, res) => {
  const { token, userId } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Device token is required' });
  }

  // Add to general tokens set
  deviceTokens.add(token);

  // Add to user-specific subscriptions if userId provided
  if (userId) {
    if (!userSubscriptions.has(userId)) {
      userSubscriptions.set(userId, new Set());
    }
    userSubscriptions.get(userId).add(token);
  }

  console.log(`Token registered: ${token.substring(0, 20)}...`);
  res.status(200).json({ 
    message: 'Token registered successfully',
    tokenCount: deviceTokens.size
  });
});

// Remove device token
app.post('/unregister-token', (req, res) => {
  const { token, userId } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Device token is required' });
  }

  deviceTokens.delete(token);

  if (userId && userSubscriptions.has(userId)) {
    userSubscriptions.get(userId).delete(token);
    if (userSubscriptions.get(userId).size === 0) {
      userSubscriptions.delete(userId);
    }
  }

  res.status(200).json({ message: 'Token unregistered successfully' });
});

// Send notification to all devices
app.post('/send-notification', async (req, res) => {
  const { title, body, data, imageUrl } = req.body;

  if (!title || !body) {
    return res.status(400).json({ error: 'Title and body are required' });
  }

  if (deviceTokens.size === 0) {
    return res.status(400).json({ error: 'No registered devices found' });
  }

  const message = {
    notification: {
      title,
      body,
      ...(imageUrl && { imageUrl })
    },
    ...(data && { data }),
    tokens: Array.from(deviceTokens)
  };

  try {
    const response = await admin.messaging().sendMulticast(message);
    
    // Remove invalid tokens
    const invalidTokens = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        const token = Array.from(deviceTokens)[idx];
        if (resp.error?.code === 'messaging/invalid-registration-token' ||
            resp.error?.code === 'messaging/registration-token-not-registered') {
          invalidTokens.push(token);
        }
      }
    });

    // Clean up invalid tokens
    invalidTokens.forEach(token => {
      deviceTokens.delete(token);
      // Also remove from user subscriptions
      userSubscriptions.forEach((tokens, userId) => {
        tokens.delete(token);
        if (tokens.size === 0) {
          userSubscriptions.delete(userId);
        }
      });
    });

    res.status(200).json({
      message: 'Notifications sent successfully',
      successCount: response.successCount,
      failureCount: response.failureCount,
      invalidTokensRemoved: invalidTokens.length
    });

  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

// Send notification to specific user
app.post('/send-notification-to-user', async (req, res) => {
  const { userId, title, body, data, imageUrl } = req.body;

  if (!userId || !title || !body) {
    return res.status(400).json({ error: 'userId, title, and body are required' });
  }

  const userTokens = userSubscriptions.get(userId);
  if (!userTokens || userTokens.size === 0) {
    return res.status(400).json({ error: 'No registered devices found for this user' });
  }

  const message = {
    notification: {
      title,
      body,
      ...(imageUrl && { imageUrl })
    },
    ...(data && { data }),
    tokens: Array.from(userTokens)
  };

  try {
    const response = await admin.messaging().sendMulticast(message);
    
    // Handle invalid tokens
    const invalidTokens = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        const token = Array.from(userTokens)[idx];
        if (resp.error?.code === 'messaging/invalid-registration-token' ||
            resp.error?.code === 'messaging/registration-token-not-registered') {
          invalidTokens.push(token);
        }
      }
    });

    // Clean up invalid tokens
    invalidTokens.forEach(token => {
      deviceTokens.delete(token);
      userTokens.delete(token);
    });

    if (userTokens.size === 0) {
      userSubscriptions.delete(userId);
    }

    res.status(200).json({
      message: 'Notification sent to user successfully',
      successCount: response.successCount,
      failureCount: response.failureCount,
      invalidTokensRemoved: invalidTokens.length
    });

  } catch (error) {
    console.error('Error sending notification to user:', error);
    res.status(500).json({ error: 'Failed to send notification to user' });
  }
});

// Send notification to specific token
app.post('/send-notification-to-token', async (req, res) => {
  const { token, title, body, data, imageUrl } = req.body;

  if (!token || !title || !body) {
    return res.status(400).json({ error: 'Token, title, and body are required' });
  }

  const message = {
    notification: {
      title,
      body,
      ...(imageUrl && { imageUrl })
    },
    ...(data && { data }),
    token
  };

  try {
    const response = await admin.messaging().send(message);
    res.status(200).json({
      message: 'Notification sent successfully',
      messageId: response
    });

  } catch (error) {
    console.error('Error sending notification to token:', error);
    
    // Handle invalid token
    if (error.code === 'messaging/invalid-registration-token' ||
        error.code === 'messaging/registration-token-not-registered') {
      deviceTokens.delete(token);
      userSubscriptions.forEach((tokens) => {
        tokens.delete(token);
      });
    }

    res.status(500).json({ 
      error: 'Failed to send notification',
      details: error.message 
    });
  }
});

// Get server stats
app.get('/stats', (req, res) => {
  res.status(200).json({
    totalDevices: deviceTokens.size,
    totalUsers: userSubscriptions.size,
    userBreakdown: Object.fromEntries(
      Array.from(userSubscriptions.entries()).map(([userId, tokens]) => 
        [userId, tokens.size]
      )
    )
  });
});

// Send topic notification
app.post('/send-topic-notification', async (req, res) => {
  const { topic, title, body, data, imageUrl } = req.body;

  if (!topic || !title || !body) {
    return res.status(400).json({ error: 'Topic, title, and body are required' });
  }

  const message = {
    notification: {
      title,
      body,
      ...(imageUrl && { imageUrl })
    },
    ...(data && { data }),
    topic
  };

  try {
    const response = await admin.messaging().send(message);
    res.status(200).json({
      message: 'Topic notification sent successfully',
      messageId: response
    });

  } catch (error) {
    console.error('Error sending topic notification:', error);
    res.status(500).json({ 
      error: 'Failed to send topic notification',
      details: error.message 
    });
  }
});

// Subscribe to topic
app.post('/subscribe-to-topic', async (req, res) => {
  const { tokens, topic } = req.body;

  if (!tokens || !topic || !Array.isArray(tokens)) {
    return res.status(400).json({ error: 'Tokens array and topic are required' });
  }

  try {
    const response = await admin.messaging().subscribeToTopic(tokens, topic);
    res.status(200).json({
      message: 'Subscribed to topic successfully',
      successCount: response.successCount,
      failureCount: response.failureCount
    });

  } catch (error) {
    console.error('Error subscribing to topic:', error);
    res.status(500).json({ 
      error: 'Failed to subscribe to topic',
      details: error.message 
    });
  }
});

// Unsubscribe from topic
app.post('/unsubscribe-from-topic', async (req, res) => {
  const { tokens, topic } = req.body;

  if (!tokens || !topic || !Array.isArray(tokens)) {
    return res.status(400).json({ error: 'Tokens array and topic are required' });
  }

  try {
    const response = await admin.messaging().unsubscribeFromTopic(tokens, topic);
    res.status(200).json({
      message: 'Unsubscribed from topic successfully',
      successCount: response.successCount,
      failureCount: response.failureCount
    });

  } catch (error) {
    console.error('Error unsubscribing from topic:', error);
    res.status(500).json({ 
      error: 'Failed to unsubscribe from topic',
      details: error.message 
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`FCM Push Notification Server is running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
