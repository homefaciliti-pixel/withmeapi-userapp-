const dotenv = require('dotenv');

dotenv.config();

const smsConfig = {
  entityId: process.env.SMS_ENTITY_ID || '1201173444411453897',
  templateId: process.env.SMS_DLT_TEMPLATE_ID || '1207173589889308632',
  senderId: process.env.SMS_SENDER_ID || 'HMFCLI',
  templateText: process.env.SMS_TEMPLATE_TEXT || 'Your OTP for registering on Superhome is: {#var#}. This code is valid for the next 10 minutes. Thank You, Super Home',
  provider: process.env.SMSProvider || process.env.SMS_PROVIDER || process.env.SMS_VENDOR || 'SMSGATEWAYHUB',
  apiKey: process.env.SMS_API_KEY || process.env.APIKey || process.env.API_KEY || process.env.SMS_KEY || process.env.AUTHKEY || process.env.AUTH_KEY || 'b395HRZTRUGZThPOeRSnVg'
};

/**
 * Format SMS message using DLT Template
 * @param {string} otp 
 * @returns {string} Formatted SMS content
 */
const formatSmsTemplate = (otp) => {
  return smsConfig.templateText.split('{#var#}').join(otp);
};

/**
 * Send OTP SMS using configured DLT parameters via SMSGATEWAYHUB or other gateway
 * @param {string} phoneNumber 
 * @param {string} otp 
 * @returns {Promise<Object>} Status response
 */
const sendOtpSms = async (phoneNumber, otp) => {
  const cleanPhone = phoneNumber.replace(/[^0-9]/g, '').slice(-10); // 10 digit Indian number
  const formattedMessage = formatSmsTemplate(otp);

  console.log(`[SMS DLT GATEWAY] Triggering SMS to ${cleanPhone}:`);
  console.log(`  - Provider: ${smsConfig.provider}`);
  console.log(`  - Sender ID: ${smsConfig.senderId}`);
  console.log(`  - Entity ID: ${smsConfig.entityId}`);
  console.log(`  - DLT Template ID: ${smsConfig.templateId}`);
  console.log(`  - OTP Code: ${otp}`);
  console.log(`  - Message Body: "${formattedMessage}"`);

  // SMSGATEWAYHUB Live Integration
  try {
    const apiKey = smsConfig.apiKey || 'b395HRZTRUGZThPOeRSnVg';
    const encodedText = encodeURIComponent(formattedMessage);
    
    // SMSGATEWAYHUB Official HTTP GET API URL
    const smsGatewayHubUrl = `https://www.smsgatewayhub.com/api/mt/SendSMS?APIKey=${apiKey}&senderid=${smsConfig.senderId}&channel=2&DCS=0&flashSms=0&number=${cleanPhone}&text=${encodedText}&route=1&EntityId=${smsConfig.entityId}&dlttemplateid=${smsConfig.templateId}`;

    console.log(`[SMSGATEWAYHUB REQUEST]: Dispatching to www.smsgatewayhub.com...`);
    const response = await fetch(smsGatewayHubUrl);
    const responseData = await response.json().catch(async () => {
      const text = await response.text().catch(() => '');
      return { raw_response: text };
    });

    console.log(`[SMSGATEWAYHUB RESPONSE]:`, responseData);

    return {
      success: true,
      provider: 'SMSGATEWAYHUB',
      message: 'SMS request dispatched to SMSGATEWAYHUB API',
      gateway_response: responseData
    };
  } catch (error) {
    console.error('❌ SMSGATEWAYHUB API Error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  smsConfig,
  formatSmsTemplate,
  sendOtpSms
};
