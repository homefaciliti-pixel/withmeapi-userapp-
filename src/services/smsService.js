const dotenv = require('dotenv');

dotenv.config();

const smsConfig = {
  entityId: process.env.SMS_ENTITY_ID || '1201173444411453897',
  templateId: process.env.SMS_DLT_TEMPLATE_ID || '1207173589889308632',
  senderId: process.env.SMS_SENDER_ID || 'HMFCLI',
  templateText: process.env.SMS_TEMPLATE_TEXT || 'Your OTP for registering on Superhome is: {#var#}. This code is valid for the next 10 minutes. Thank You, Super Home'
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
 * Send OTP SMS using configured DLT parameters
 * @param {string} phoneNumber 
 * @param {string} otp 
 * @returns {Promise<Object>} Status response
 */
const sendOtpSms = async (phoneNumber, otp) => {
  const formattedMessage = formatSmsTemplate(otp);

  const payload = {
    entity_id: smsConfig.entityId,
    dlt_template_id: smsConfig.templateId,
    sender_id: smsConfig.senderId,
    phone_number: phoneNumber,
    message: formattedMessage,
    otp_code: otp
  };

  console.log(`[SMS DLT GATEWAY] Sending OTP to ${phoneNumber}:`);
  console.log(`  - Sender ID: ${smsConfig.senderId}`);
  console.log(`  - Entity ID: ${smsConfig.entityId}`);
  console.log(`  - DLT Template ID: ${smsConfig.templateId}`);
  console.log(`  - Message Body: "${formattedMessage}"`);

  // In production, integrate with SMS gateway HTTP API (Fast2SMS / Msg91 / Textlocal / Jio DLT)
  return {
    success: true,
    message: 'SMS sent via DLT Gateway',
    details: payload
  };
};

module.exports = {
  smsConfig,
  formatSmsTemplate,
  sendOtpSms
};
