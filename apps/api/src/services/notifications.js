/**
 * Notifications Service
 * Handles SMS (Twilio), Push Notifications (Firebase), and Email alerts
 */

class NotificationService {
  constructor() {
    this.twilioClient = null;
    this.firebaseAdmin = null;
    this.isInitialized = false;
    
    // SMS enabled flag - set to false to save credits during development
    this.smsEnabled = process.env.SMS_ENABLED !== 'false';
    
    // Rate limiting to prevent alert spam
    this.sentAlerts = new Map(); // key: `${machineId}_${alertType}`, value: timestamp
    this.alertCooldown = 5 * 60 * 1000; // 5 minutes between same alerts
    
    this.init();
  }

  init() {
    // Initialize Twilio
    if (!this.smsEnabled) {
      console.log('📵 SMS disabled (SMS_ENABLED=false) - saving Twilio credits');
    } else if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      const twilio = require('twilio');
      this.twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
      console.log('✅ Twilio SMS service initialized');
    } else {
      console.log('⚠️ Twilio not configured - SMS alerts disabled');
    }

    // Initialize Firebase Admin
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY) {
      const admin = require('firebase-admin');
      
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
          })
        });
      }
      
      this.firebaseAdmin = admin;
      console.log('✅ Firebase Push Notifications initialized');
    } else {
      console.log('⚠️ Firebase not configured - Push notifications disabled');
    }

    this.isInitialized = true;
  }

  /**
   * Check if alert should be sent (rate limiting)
   */
  shouldSendAlert(machineId, alertType) {
    const key = `${machineId}_${alertType}`;
    const lastSent = this.sentAlerts.get(key);
    
    if (lastSent && Date.now() - lastSent < this.alertCooldown) {
      return false;
    }
    
    this.sentAlerts.set(key, Date.now());
    return true;
  }

  /**
   * Send SMS via Twilio
   */
  async sendSMS(to, message, options = {}) {
    // Check if SMS is disabled
    if (!this.smsEnabled) {
      console.log('📵 SMS skipped (disabled for development):', message.substring(0, 50));
      return { success: false, reason: 'sms_disabled', message: 'SMS disabled to save credits' };
    }
    
    if (!this.twilioClient) {
      console.log('📵 SMS skipped (Twilio not configured):', message.substring(0, 50));
      return { success: false, reason: 'twilio_not_configured' };
    }

    try {
      const result = await this.twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: to
      });

      console.log(`📱 SMS sent to ${to}: ${result.sid}`);
      return { success: true, sid: result.sid };
    } catch (err) {
      console.error('❌ SMS send error:', err.message);
      return { success: false, error: err.message };
    }
  }

  // Alias for backwards compatibility
  async sendSms(to, message, options = {}) {
    return this.sendSMS(to, message, options);
  }

  /**
   * Send Push Notification via Firebase
   */
  async sendPushNotification(token, title, body, data = {}) {
    if (!this.firebaseAdmin) {
      console.log('🔕 Push skipped (Firebase not configured):', title);
      return { success: false, reason: 'firebase_not_configured' };
    }

    try {
      const message = {
        notification: {
          title,
          body
        },
        data: {
          ...data,
          click_action: 'FLUTTER_NOTIFICATION_CLICK'
        },
        token
      };

      const result = await this.firebaseAdmin.messaging().send(message);
      console.log(`🔔 Push sent: ${result}`);
      return { success: true, messageId: result };
    } catch (err) {
      console.error('❌ Push notification error:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Send Push to multiple devices (topic or multiple tokens)
   */
  async sendPushToTopic(topic, title, body, data = {}) {
    if (!this.firebaseAdmin) {
      return { success: false, reason: 'firebase_not_configured' };
    }

    try {
      const message = {
        notification: { title, body },
        data: { ...data, click_action: 'FLUTTER_NOTIFICATION_CLICK' },
        topic
      };

      const result = await this.firebaseAdmin.messaging().send(message);
      console.log(`🔔 Topic push sent to ${topic}: ${result}`);
      return { success: true, messageId: result };
    } catch (err) {
      console.error('❌ Topic push error:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Send alert notification (SMS + Push) for critical events
   */
  async sendAlert(alert) {
    const { machineId, machineName, type, severity, message, ownerPhone, ownerPushToken } = alert;

    // Rate limit check
    if (!this.shouldSendAlert(machineId, type)) {
      console.log(`⏳ Alert rate-limited: ${machineId} - ${type}`);
      return { sent: false, reason: 'rate_limited' };
    }

    const results = { sms: null, push: null };

    // Construct message
    const alertTitle = `🚨 AgriTrack Alert: ${type.toUpperCase()}`;
    const alertBody = `${machineName || machineId}: ${message}`;
    const smsMessage = `[AgriTrack] ${severity.toUpperCase()} ALERT\n${machineName || machineId}\n${message}\nTime: ${new Date().toLocaleString('en-IN')}`;

    // Send SMS for critical alerts or if explicitly requested
    if (ownerPhone && (severity === 'critical' || alert.forceSMS)) {
      results.sms = await this.sendSMS(ownerPhone, smsMessage);
    }

    // Send Push notification
    if (ownerPushToken) {
      results.push = await this.sendPushNotification(
        ownerPushToken,
        alertTitle,
        alertBody,
        {
          machineId,
          alertType: type,
          severity,
          timestamp: Date.now().toString()
        }
      );
    }

    // Also send to admin topic for all critical alerts
    if (severity === 'critical') {
      await this.sendPushToTopic('admin_alerts', alertTitle, alertBody, {
        machineId,
        alertType: type,
        severity
      });
    }

    return { sent: true, results };
  }

  /**
   * Send geofence breach alert
   */
  async sendGeofenceAlert(machineId, machineName, geofenceName, location, contacts) {
    const message = `Machine "${machineName}" has left geofence "${geofenceName}". Current location: ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`;
    
    return this.sendAlert({
      machineId,
      machineName,
      type: 'geofence',
      severity: 'warning',
      message,
      ownerPhone: contacts?.phone,
      ownerPushToken: contacts?.pushToken,
      forceSMS: true
    });
  }

  /**
   * Send maintenance reminder
   */
  async sendMaintenanceReminder(machineId, machineName, maintenanceType, dueDate, contacts) {
    const message = `Scheduled ${maintenanceType} for "${machineName}" is due on ${dueDate}. Please schedule service.`;
    
    // Send to topic for all maintenance personnel
    await this.sendPushToTopic('maintenance_team', 
      '🔧 Maintenance Due', 
      message,
      { machineId, maintenanceType, dueDate }
    );

    if (contacts?.phone) {
      await this.sendSMS(contacts.phone, `[AgriTrack] MAINTENANCE REMINDER\n${message}`);
    }
  }

  /**
   * Send fuel low alert
   */
  async sendFuelAlert(machineId, machineName, fuelLevel, contacts) {
    const message = `Fuel level critically low (${fuelLevel}%) for "${machineName}". Refueling needed.`;
    
    return this.sendAlert({
      machineId,
      machineName,
      type: 'fuel_low',
      severity: fuelLevel < 10 ? 'critical' : 'warning',
      message,
      ownerPhone: contacts?.phone,
      ownerPushToken: contacts?.pushToken
    });
  }
}

module.exports = new NotificationService();
