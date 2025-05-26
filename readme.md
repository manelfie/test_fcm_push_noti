# FCM Push Notification Server

A complete Node.js server implementation for sending Firebase Cloud Messaging (FCM) push notifications with a web client for testing.

## Features

- 🚀 **Complete FCM Integration**: Send push notifications to web, Android, and iOS devices
- 🎯 **Multiple Targeting Options**: Send to all devices, specific users, individual tokens, or topics
- 🌐 **Web Client Interface**: Beautiful testing interface with real-time functionality
- 📊 **Server Statistics**: Monitor registered devices and user subscriptions
- 🔄 **Topic Management**: Subscribe/unsubscribe devices to/from topics
- 🛡️ **Security**: Helmet.js for security headers and input validation
- 📱 **Service Worker**: Background notification handling
- 💾 **Token Management**: Automatic cleanup of invalid tokens

## Project Structure

```
fcm-push-notification-server/
├── server.js                    # Main server file
├── package.json                 # Dependencies and scripts
├── .env.example                 # Environment variables template
├── .env                         # Your environment variables (create this)
├── public/
│   ├── index.html              # Web client interface
│   └── firebase-messaging-sw.js # Service worker for background messages
└── README.md                   # This file
```

## Setup Instructions

### 1. Firebase Project Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing one
3. Enable **Cloud Messaging** in your project
4. Generate a service account key:
   - Go to Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - Download the JSON file

### 2. Web App Configuration

1. In Firebase Console, add a web app to your project
2. Copy the Firebase configuration object
3. Get your VAPID key from Project Settings → Cloud Messaging → Web configuration

### 3. Server Installation

```bash
# Clone or create the project directory
mkdir fcm-push-notification-server
cd fcm-push-notification-server

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
```

### 4. Environment Configuration

Edit `.env` file with your Firebase service account details:

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40your-project-id.iam.gserviceaccount.com
PORT=3000
```

### 5. Client Configuration

Update the Firebase configuration in both files:
- `public/index.html` (line ~220)
- `public/firebase-messaging-sw.js` (line ~6)

Replace the configuration object and VAPID key with your values.

### 6. Run the Server

```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

Server will start on `http://localhost:3000`

## API Endpoints

### Device Management

- **POST /register-token** - Register FCM token
  ```json
  {
    "token": "fcm-token-here",
    "userId": "user123" // optional
  }
  ```

- **POST /unregister-token** - Remove FCM token
  ```json
  {
    "token": "fcm-token-here",
    "userId": "user123" // optional
  }
  ```

### Send Notifications

- **POST /send-notification** - Send to all registered devices
  ```json
  {
    "title": "Hello World",
    "body": "This is a test notification",
    "imageUrl": "https://example.com/image.jpg", // optional
    "data": {"key": "value"} // optional
  }
  ```

- **POST /send-notification-to-token** - Send to specific token
  ```json
  {
    "token": "fcm-token-here",
    "title": "Hello World",
    "body": "This is a test notification"
  }
  ```

- **POST /send-notification-to-user** - Send to specific user
  ```json
  {
    "userId": "user123",
    "title": "Hello World",
    "body": "This is a test notification"
  }
  ```

### Topic Management

- **POST /send-topic-notification** - Send to topic subscribers
  ```json
  {
    "topic": "general",
    "title": "Topic News",
    "body": "Latest updates for topic subscribers"
  }
  ```

- **POST /subscribe-to-topic** - Subscribe tokens to topic
  ```json
  {
    "tokens": ["token1", "token2"],
    "topic": "general"
  }
  ```

- **POST /unsubscribe-from-topic** - Unsubscribe from topic
  ```json
  {
    "tokens": ["token1", "token2"],
    "topic": "general"
  }
  ```

### Monitoring

- **GET /health** - Server health check
- **GET /stats** - Get server statistics

## Web Client Usage

1. Open `http://localhost:3000` in your browser
2. Click "Initialize Firebase"
3. Click "Request Permission" to enable notifications
4. Click "Get FCM Token" to retrieve your device token
5. Click "Register Token" to register with the server
6. Use the interface to send test notifications

## Testing Push Notifications

### Method 1: Using the Web Interface
1. Open the web client
2. Follow the setup steps
3. Use the "Send Test Notifications" section

### Method 2: Using cURL

```bash
# Send to all devices
curl -X POST http://localhost:3000/send-notification \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Notification",
    "body": "Hello from cURL!",
    "data": {"source": "curl"}
  }'

# Send to specific token
curl -X POST http://localhost:3000/send-notification-to-token \
  -H "Content-Type: application/json" \
  -d '{
    "token": "your-fcm-token-here",
    "title": "Direct Message",
    "body": "This is sent directly to your device"
  }'
```

### Method 3: Using Postman
Import the endpoints into Postman and test with the JSON payloads shown above.

## Production Deployment

### Environment Variables
Set these in your production environment:
- All Firebase configuration variables
- `NODE_ENV=production`
- `PORT=3000` (or your preferred port)

### Database Integration
For production, replace the in-memory storage with a database:

```javascript
// Replace deviceTokens Set with database queries
// Replace userSubscriptions Map with database relations
// Consider using Redis for fast token lookups
```

### Security Considerations
- Use HTTPS in production
- Implement rate limiting
- Add authentication for sensitive endpoints
- Validate all input data
- Monitor for invalid tokens and clean up regularly

### Scaling
- Use a load balancer for multiple server instances
- Implement database connection pooling
- Consider using Redis for session storage
- Monitor server performance and FCM quotas

## Troubleshooting

### Common Issues

1. **"Firebase initialization failed"**
   - Check your Firebase configuration
   - Ensure your project has Cloud Messaging enabled

2. **"No registration token available"**
   - Check browser permissions
   - Verify VAPID key is correct
   - Ensure HTTPS (required for FCM in production)

3. **"Token registration failed"**
   - Check server is running
   - Verify server URL in client
   - Check network connectivity

4. **Notifications not received**
   - Check browser notification permissions
   - Verify token is registered on server
   - Check browser console for errors
   - Ensure service worker is properly registered

### Debug Tips

- Check browser console for JavaScript errors
- Monitor server logs for API errors
- Use Firebase Console to test FCM directly
- Verify service worker registration in DevTools

## License

MIT License - feel free to use this project for your applications.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

For issues and questions:
- Check the troubleshooting section
- Review Firebase FCM documentation
- Open an issue in the project repository
