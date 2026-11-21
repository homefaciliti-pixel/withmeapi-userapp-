const https = require('https');
const dotenv = require('dotenv');

dotenv.config();

const IDFY_BASE_URL = process.env.IDFY_BASE_URL || 'https://eve.idfy.com';
const IDFY_ACCOUNT_ID = process.env.IDFY_ACCOUNT_ID || '4f93969f1cd0/2db93a3c-8e20-4107-ac5c-456b0e60ea82';
const IDFY_API_KEY = process.env.IDFY_API_KEY || 'd78bd536-4763-49ce-99d2-4063e2ca1c61';

/**
 * Submit an async Aadhaar extraction (OCR) task to IDfy
 * @param {Object} params
 * @param {string} params.frontDocument - Public URL or Base64 of Aadhaar front
 * @param {string} [params.backDocument] - Public URL or Base64 of Aadhaar back
 * @param {string} [params.taskId] - Optional unique task ID
 * @param {string} [params.groupId] - Optional group ID
 * @returns {Promise<{success: boolean, request_id?: string, error?: string, raw?: any}>}
 */
async function submitAadhaarOcrTask({ frontDocument, backDocument, taskId, groupId }) {
  if (!frontDocument) {
    return { success: false, error: 'frontDocument (document1) is required' };
  }

  const finalTaskId = taskId || `task_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const finalGroupId = groupId || `grp_${Date.now()}`;

  const payload = {
    task_id: finalTaskId,
    group_id: finalGroupId,
    data: {
      document1: frontDocument,
      ...(backDocument ? { document2: backDocument } : {}),
      consent: 'yes'
    }
  };

  const payloadData = JSON.stringify(payload);
  const url = new URL(`${IDFY_BASE_URL}/v3/tasks/async/extract/ind_aadhaar`);

  return new Promise((resolve) => {
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': IDFY_API_KEY,
        'account-id': IDFY_ACCOUNT_ID,
        'Content-Length': Buffer.byteLength(payloadData)
      },
      timeout: 15000
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (res.statusCode === 202 || res.statusCode === 200) {
            resolve({
              success: true,
              request_id: parsed.request_id || parsed.task_id,
              status: 'queued',
              raw: parsed
            });
          } else {
            resolve({
              success: false,
              statusCode: res.statusCode,
              error: parsed.message || parsed.error || 'IDfy task submission failed',
              raw: parsed
            });
          }
        } catch (parseErr) {
          resolve({
            success: false,
            statusCode: res.statusCode,
            error: 'Invalid JSON response from IDfy API',
            raw: body
          });
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, error: 'IDfy request timeout' });
    });

    req.on('error', (err) => {
      resolve({ success: false, error: err.message });
    });

    req.write(payloadData);
    req.end();
  });
}

/**
 * Poll IDfy for task status and extracted results
 * @param {string} requestId
 * @returns {Promise<{success: boolean, status?: string, data?: any, error?: string}>}
 */
async function getTaskStatus(requestId) {
  if (!requestId) {
    return { success: false, error: 'requestId is required' };
  }

  const url = new URL(`${IDFY_BASE_URL}/v3/tasks?request_id=${encodeURIComponent(requestId)}`);

  return new Promise((resolve) => {
    const options = {
      hostname: url.hostname,
      port: 443,
      path: `${url.pathname}${url.search}`,
      method: 'GET',
      headers: {
        'api-key': IDFY_API_KEY,
        'account-id': IDFY_ACCOUNT_ID
      },
      timeout: 10000
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (res.statusCode === 200 && Array.isArray(parsed) && parsed.length > 0) {
            const task = parsed[0];
            resolve({
              success: true,
              status: task.status, // 'completed', 'failed', 'processing', 'queued'
              task: task,
              data: task.result || task.data || null,
              error: task.error || (task.status === 'failed' ? task.message : null)
            });
          } else {
            resolve({
              success: false,
              statusCode: res.statusCode,
              error: 'Task not found or unexpected structure',
              raw: parsed
            });
          }
        } catch (err) {
          resolve({ success: false, error: err.message, raw: body });
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, error: 'IDfy polling timeout' });
    });

    req.on('error', (err) => {
      resolve({ success: false, error: err.message });
    });

    req.end();
  });
}

/**
 * Helper to submit task and poll for completion
 * @param {Object} params
 * @param {string} params.frontDocument
 * @param {string} [params.backDocument]
 * @param {number} [params.maxAttempts=6]
 * @param {number} [params.delayMs=2000]
 */
async function extractAadhaarDetails({ frontDocument, backDocument, maxAttempts = 5, delayMs = 2000 }) {
  const submitRes = await submitAadhaarOcrTask({ frontDocument, backDocument });
  if (!submitRes.success || !submitRes.request_id) {
    return {
      success: false,
      error: submitRes.error || 'Failed to submit Aadhaar extraction task',
      details: submitRes
    };
  }

  const requestId = submitRes.request_id;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // Wait before polling
    await new Promise((r) => setTimeout(r, delayMs));

    const pollRes = await getTaskStatus(requestId);
    if (!pollRes.success) continue;

    if (pollRes.status === 'completed') {
      const extracted = pollRes.data || (pollRes.task && pollRes.task.result) || {};
      const fields = extracted.extraction_output || extracted;

      // Extract normalized attributes
      const aadhaarNumber = fields.aadhaar_number || fields.id_number || fields.uid || null;
      const cleanAadhaar = aadhaarNumber ? String(aadhaarNumber).replace(/\D/g, '') : null;
      const name = fields.name || fields.full_name || null;
      const dob = fields.dob || fields.date_of_birth || null;
      const gender = fields.gender || null;
      const careOf = fields.care_of || fields.father_name || null;
      const address = fields.address || null;
      const pincode = fields.pincode || (address && address.pincode ? address.pincode : null);

      return {
        success: true,
        request_id: requestId,
        status: 'completed',
        is_verified: true,
        data: {
          aadhaar_number: cleanAadhaar,
          aadhaar_number_masked: cleanAadhaar && cleanAadhaar.length >= 4 ? cleanAadhaar.slice(-4).padStart(cleanAadhaar.length, '*') : null,
          name: name,
          full_name: name,
          dob: dob,
          date_of_birth: dob,
          gender: gender,
          care_of: careOf,
          address: address,
          pincode: pincode,
          confidence_score: extracted.confidence_score || 0.95
        },
        raw_result: pollRes.task
      };
    }

    if (pollRes.status === 'failed') {
      return {
        success: false,
        request_id: requestId,
        status: 'failed',
        error: pollRes.error || (pollRes.task && pollRes.task.message) || 'Aadhaar extraction failed',
        raw_result: pollRes.task
      };
    }
  }

  // If timed out, return request_id so caller can poll asynchronously
  return {
    success: true,
    request_id: requestId,
    status: 'processing',
    message: 'Aadhaar extraction is still processing in background'
  };
}

module.exports = {
  submitAadhaarOcrTask,
  getTaskStatus,
  extractAadhaarDetails,
  IDFY_BASE_URL,
  IDFY_ACCOUNT_ID,
  IDFY_API_KEY
};
