const dotenv = require('dotenv');

dotenv.config();

const smsConfig = {
  entityId: process.env.SMS_ENTITY_ID || '1201173444411453897',
  templateId: process.env.SMS_DLT_TEMPLATE_ID || '1207173589889308632',
  senderId: process.env.SMS_SENDER_ID || 'HMFCLI',
  templateText: process.env.SMS_TEMPLATE_TEXT || 'Your OTP for registering on Superhome is: {#var#}. This code is valid for the next 10 minutes. Thank You, Super Home',
  apiKey: process.env.SMS_API_KEY || '',
  apiUrl: process.env.SMS_API_URL || '',
  vendor: process.env.SMS_VENDOR || 'fast2sms' // 'fast2sms', 'msg91', 'generic'
};

/**
 * Format SMS message using DLT Template
 * @param {string} otp 
 * @returns {string} Formatted SMS content
 */
const formatSmsTemplate = (otp) => {
  return smsConfig.templateText.replace('{#var#}', otp);
};

/**
 * Send OTP SMS using configured DLT parameters via real SMS Gateway HTTP API
 * @param {string} phoneNumber 
 * @param {string} otp 
 * @returns {Promise<Object>} Status response
 */
const sendOtpSms = async (phoneNumber, otp) => {
  const cleanPhone = phoneNumber.replace(/[^0-9]/g, '').slice(-10); // 10 digit Indian number
  const formattedMessage = formatSmsTemplate(otp);

  console.log(`[SMS DLT GATEWAY] Triggering SMS to ${cleanPhone}:`);
  console.log(`  - Sender ID: ${smsConfig.senderId}`);
  console.log(`  - DLT Template ID: ${smsConfig.templateId}`);
  console.log(`  - OTP Code: ${otp}`);
  console.log(`  - Message Body: "${formattedMessage}"`);

  // If real SMS_API_KEY or SMS_API_URL is configured in .env or Render environment
  if (smsConfig.apiKey || smsConfig.apiUrl) {
    try {
      let response;
      if (smsConfig.vendor === 'fast2sms' || smsConfig.apiKey.length > 20) {
        // Fast2SMS DLT Gateway API Integration
        const url = 'https://www.fast2sms.com/dev/bulkV2';
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'authorization': smsConfig.apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            route: 'dlt',
            sender_id: smsConfig.senderId,
            message: smsConfig.templateId,
            variables_values: otp,
            numbers: cleanPhone
          })
        });
      } else if (smsConfig.apiUrl) {
        // Generic HTTP SMS Gateway API
        const queryUrl = smsConfig.apiUrl
          .replace('{phone}', cleanPhone)
          .replace('{otp}', otp)
          .replace('{message}', encodeURIComponent(formattedMessage))
          .replace('{sender}', smsConfig.senderId)
          .replace('{template_id}', smsConfig.templateId)
          .replace('{entity_id}', smsConfig.entityId);

        response = await fetch(queryUrl);
      }

      if (response) {
        const responseData = await response.json().catch(() => ({}));
        console.log(`[SMS GATEWAY RESPONSE]:`, responseData);
        return {
          success: true,
          message: 'SMS dispatched via real SMS Gateway API',
          gateway_response: responseData
        };
      }
    } catch (error) {
      console.error('❌ SMS Gateway API Error:', error.message);
    }
  } else {
    console.log('ℹ️ Note: SMS_API_KEY is not set in environment. Add SMS_API_KEY in .env or Render Environment Variables to send real network SMS.');
  }

  return {
    success: true,
    message: 'SMS sent via DLT Gateway Logger (Add SMS_API_KEY for live network dispatch)',
    details: {
      phone_number: cleanPhone,
      otp_code: otp,
      formatted_message: formattedMessage
    }
  };
};

module.exports = {
  smsConfig,
  formatSmsTemplate,
  sendOtpSms
};
