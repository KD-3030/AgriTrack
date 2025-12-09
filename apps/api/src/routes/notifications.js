/**
 * Notifications API Routes
 */
const express = require('express');
const router = express.Router();
const notificationService = require('../services/notifications');
const db = require('../services/database');

/**
 * GET /api/notifications/preferences/:userId
 * Get notification preferences for a user
 */
router.get('/preferences/:userId', async (req, res) => {
  try {
    const supabase = db.getClient();
    if (!supabase) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', req.params.userId);

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/notifications/preferences
 * Save notification preferences
 */
router.post('/preferences', async (req, res) => {
  try {
    const supabase = db.getClient();
    if (!supabase) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const { userId, alertType, smsEnabled, pushEnabled, emailEnabled } = req.body;

    const { data, error } = await supabase
      .from('notification_preferences')
      .upsert({
        user_id: userId,
        alert_type: alertType,
        sms_enabled: smsEnabled ?? true,
        push_enabled: pushEnabled ?? true,
        email_enabled: emailEnabled ?? false
      }, { onConflict: 'user_id,alert_type' })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/notifications/push-token
 * Register push notification token
 */
router.post('/push-token', async (req, res) => {
  try {
    const supabase = db.getClient();
    if (!supabase) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const { userId, token, deviceType } = req.body;

    // Check if token already exists
    const { data: existing } = await supabase
      .from('push_tokens')
      .select('id')
      .eq('user_id', userId)
      .eq('token', token)
      .single();

    if (existing) {
      return res.json({ message: 'Token already registered', id: existing.id });
    }

    const { data, error } = await supabase
      .from('push_tokens')
      .insert({
        user_id: userId,
        token,
        device_type: deviceType
      })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/notifications/push-token
 * Remove push notification token
 */
router.delete('/push-token', async (req, res) => {
  try {
    const supabase = db.getClient();
    if (!supabase) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const { token } = req.body;

    const { error } = await supabase
      .from('push_tokens')
      .delete()
      .eq('token', token);

    if (error) throw error;
    res.json({ message: 'Token removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/notifications/send
 * Send a notification (admin only)
 */
router.post('/send', async (req, res) => {
  try {
    const { type, userId, title, message, data } = req.body;

    let result = {};

    if (type === 'sms' && req.body.phone) {
      const smsResult = await notificationService.sendSms(req.body.phone, message);
      result.sms = smsResult ? 'sent' : 'failed';
    }

    if (type === 'push' && req.body.token) {
      const pushResult = await notificationService.sendPushNotification(
        req.body.token,
        title,
        message,
        data
      );
      result.push = pushResult ? 'sent' : 'failed';
    }

    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/notifications/bulk-sms
 * Send bulk SMS (admin only)
 */
router.post('/bulk-sms', async (req, res) => {
  try {
    const { phoneNumbers, message } = req.body;

    if (!Array.isArray(phoneNumbers)) {
      return res.status(400).json({ error: 'phoneNumbers must be an array' });
    }

    const results = await notificationService.sendBulkSms(phoneNumbers, message);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Import alert manager for testing routes
const alertManager = require('../services/alertManager');

/**
 * POST /api/notifications/test-alert
 * Send a test alert to verify notification system
 */
router.post('/test-alert', async (req, res) => {
  try {
    const { deviceId, phone, alertType } = req.body;

    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    // Send test alert
    const result = await alertManager.sendTestAlert(deviceId || 'test_device', phone);
    
    res.json({
      success: result.success,
      message: result.success ? 'Test alert sent successfully!' : 'Failed to send test alert',
      details: result
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/notifications/simulate-alert
 * Simulate different types of alerts for testing
 */
router.post('/simulate-alert', async (req, res) => {
  try {
    const { deviceId, alertType, value } = req.body;

    if (!deviceId || !alertType) {
      return res.status(400).json({ error: 'deviceId and alertType are required' });
    }

    let result;
    switch (alertType) {
      case 'overheat':
        result = await alertManager.handleOverheatAlert(deviceId, value || 95, 90);
        break;
      case 'vibration':
        result = await alertManager.handleVibrationAlert(deviceId, value || 0.8, 0.5);
        break;
      case 'fuel_low':
        result = await alertManager.handleFuelAlert(deviceId, value || 15);
        break;
      case 'fuel_critical':
        result = await alertManager.handleFuelAlert(deviceId, value || 5);
        break;
      case 'geofence':
        result = await alertManager.handleGeofenceAlert(deviceId, 'Test Zone', 'exited', {
          lat: 30.9010,
          lng: 75.8573
        });
        break;
      case 'maintenance':
        result = await alertManager.handleMaintenanceAlert(deviceId, 'Oil Change', '2025-12-10');
        break;
      default:
        return res.status(400).json({ error: `Unknown alert type: ${alertType}` });
    }

    res.json({
      success: true,
      alertType,
      deviceId,
      result
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/notifications/alert-stats
 * Get alert statistics
 */
router.get('/alert-stats', async (req, res) => {
  try {
    const stats = alertManager.getAlertStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/notifications/register-owner
 * Register machine owner contact for notifications
 */
router.post('/register-owner', async (req, res) => {
  try {
    const supabase = db.getClient();
    if (!supabase) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const { deviceId, phone, email, pushToken } = req.body;

    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId is required' });
    }

    // Update machine with owner contact info
    const { data, error } = await supabase
      .from('machines')
      .update({
        owner_phone: phone,
        owner_email: email,
        owner_push_token: pushToken,
        updated_at: new Date().toISOString()
      })
      .eq('device_id', deviceId)
      .select()
      .single();

    if (error) throw error;

    // Reload machine owners cache
    alertManager.loadMachineOwners();

    res.json({
      success: true,
      message: 'Owner contact registered successfully',
      machine: data
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/notifications/harvest-alert
 * Send SMS alerts to farmers about harvest schedules
 * Body: { schedules: [{ district, harvestDate, machineName, priority }], farmers: [{ phone, name, district }] }
 */
router.post('/harvest-alert', async (req, res) => {
  try {
    const { schedules, farmers } = req.body;

    if (!schedules || !Array.isArray(schedules) || schedules.length === 0) {
      return res.status(400).json({ error: 'At least one schedule is required' });
    }

    // If no farmers provided, we'll use mock farmers for demo
    const farmersToNotify = farmers && farmers.length > 0 ? farmers : [
      { phone: process.env.DEMO_FARMER_PHONE || '+919999999999', name: 'Demo Farmer', district: 'All' }
    ];

    const results = [];
    const sentCount = { success: 0, failed: 0 };

    for (const schedule of schedules) {
      const { district, harvestDate, machineName, machineType, priority, acresCovered } = schedule;
      
      // Filter farmers by district (or send to all if district matches)
      const targetFarmers = farmersToNotify.filter(f => 
        f.district === 'All' || f.district === district || !f.district
      );

      for (const farmer of targetFarmers) {
        // Construct the message in both English and Hindi
        const priorityText = priority >= 8 ? '🔴 URGENT' : priority >= 6 ? '🟡 Important' : '🟢 Scheduled';
        const formattedDate = new Date(harvestDate).toLocaleDateString('en-IN', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

        const message = `🌾 AgriTrack Harvest Alert

${priorityText}

Dear ${farmer.name || 'Farmer'},

Your harvest is scheduled:
📅 Date: ${formattedDate}
📍 District: ${district || 'Your area'}
🚜 Machine: ${machineName || machineType || 'Harvester'}
${acresCovered ? `🌾 Area: ${acresCovered} acres` : ''}

Please prepare your field for machine arrival.

---
कृपया अपने खेत को मशीन के आगमन के लिए तैयार करें।
📞 Helpline: 1800-XXX-XXXX

- AgriTrack Team`;

        try {
          const smsResult = await notificationService.sendSMS(farmer.phone, message);
          
          if (smsResult.success) {
            sentCount.success++;
            results.push({
              farmer: farmer.name,
              phone: farmer.phone,
              district,
              status: 'sent',
              sid: smsResult.sid
            });
          } else {
            sentCount.failed++;
            results.push({
              farmer: farmer.name,
              phone: farmer.phone,
              district,
              status: 'failed',
              reason: smsResult.reason || smsResult.message
            });
          }
        } catch (err) {
          sentCount.failed++;
          results.push({
            farmer: farmer.name,
            phone: farmer.phone,
            district,
            status: 'error',
            error: err.message
          });
        }
      }
    }

    res.json({
      success: true,
      message: `Harvest alerts sent: ${sentCount.success} successful, ${sentCount.failed} failed`,
      summary: sentCount,
      details: results
    });
  } catch (err) {
    console.error('Harvest alert error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/notifications/harvest-alert/bulk
 * Send bulk SMS alerts for a specific date's schedules
 */
router.post('/harvest-alert/bulk', async (req, res) => {
  try {
    const { date, events } = req.body;

    if (!events || !Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ error: 'No events provided for the selected date' });
    }

    const results = [];
    let totalFarmers = 0;
    let successCount = 0;

    for (const event of events) {
      const { name, region, districts, farmers_count, machines_allocated, priority_score, start } = event;
      
      // In production, you would fetch actual farmer data from database
      // For demo, we'll simulate the notification
      const farmersInCluster = farmers_count || 1;
      totalFarmers += farmersInCluster;

      const priorityText = (priority_score || 0) >= 8 ? '🔴 URGENT' : 
                          (priority_score || 0) >= 6 ? '🟡 Important' : '🟢 Scheduled';
      
      const formattedDate = new Date(start).toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric', 
        month: 'long',
        day: 'numeric'
      });

      // Demo message that would be sent
      const message = `🌾 AgriTrack Harvest Alert

${priorityText}

Harvest scheduled for ${region || name}:
📅 Date: ${formattedDate}
📍 Districts: ${districts?.join(', ') || region || 'Your area'}
🚜 Machines Allocated: ${machines_allocated || 'TBD'}
👨‍🌾 Farmers Covered: ${farmersInCluster}

Please prepare your fields!

- AgriTrack Team`;

      // Check if Twilio is configured
      if (process.env.TWILIO_ACCOUNT_SID && process.env.SMS_ENABLED !== 'false') {
        // In production: send actual SMS to farmers from database
        // For now, send to demo number if configured
        const demoPhone = process.env.DEMO_FARMER_PHONE;
        if (demoPhone) {
          const smsResult = await notificationService.sendSMS(demoPhone, message);
          if (smsResult.success) {
            successCount += farmersInCluster;
          }
        }
      }

      results.push({
        cluster: name,
        region,
        farmersNotified: farmersInCluster,
        message: message.substring(0, 100) + '...',
        status: process.env.TWILIO_ACCOUNT_SID ? 'sent' : 'simulated'
      });
    }

    res.json({
      success: true,
      date,
      message: process.env.TWILIO_ACCOUNT_SID 
        ? `SMS alerts sent to ${successCount} farmers across ${events.length} clusters`
        : `SMS alerts simulated for ${totalFarmers} farmers (Twilio not configured)`,
      totalFarmers,
      clustersNotified: events.length,
      details: results
    });
  } catch (err) {
    console.error('Bulk harvest alert error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
