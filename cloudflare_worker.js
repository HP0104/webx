/**
 * CLOUDFLARE WORKER PROXY FOR WEB18P SECURE PAYMENT CHECKS (WITH SMART FALLBACK)
 * 
 * Instructions:
 * 1. Open your Cloudflare Worker dashboard.
 * 2. Click "Edit Code" on your worker 'web18p-deloy'.
 * 3. Copy all the content of this file and paste it, overwriting the old code.
 * 4. Click "Save and Deploy".
 * 5. Make sure the following environment variables (Secrets) are set in Cloudflare Worker Settings:
 *    - FIREBASE_PROJECT_ID
 *    - FIREBASE_CLIENT_EMAIL
 *    - FIREBASE_PRIVATE_KEY (Paste the service account private key. Our code will automatically clean any outer quotes and literal \n characters!)
 *    - SEPAY_API_TOKEN
 *    - PAYOS_CLIENT_ID
 *    - PAYOS_API_KEY
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request, env) {
    // Handle CORS preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    if (url.pathname === "/check-payment" && request.method === "POST") {
      try {
        const payload = await request.json();
        let { txCode, userId, gateway, amount, payosOrderCode } = payload;

        if (!txCode || !userId || !gateway || !amount) {
          return new Response(JSON.stringify({ success: false, error: "Missing required fields (txCode, userId, gateway, amount)" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        // 1. Verify payment status with SePay or PayOS APIs
        let paymentSuccess = false;
        let transactionDetails = {};
        let actualGateway = gateway;

        if (gateway === "sepay") {
          const apiToken = env.SEPAY_API_TOKEN;
          if (!apiToken) {
            return new Response(JSON.stringify({ success: false, error: "SEPAY_API_TOKEN is not configured on Cloudflare." }), {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }

          const checkResult = await checkSePayHelper(apiToken, amount, txCode);
          if (checkResult.success) {
            paymentSuccess = true;
            transactionDetails = checkResult.details;
          }

        } else if (gateway === "payos") {
          const apiKey = env.PAYOS_API_KEY;
          const clientId = env.PAYOS_CLIENT_ID;

          // Try PayOS check first if configured and orderCode exists
          if (payosOrderCode && apiKey && clientId) {
            try {
              const response = await fetch(`https://api-merchant.payos.vn/v2/payment-requests/${payosOrderCode}`, {
                headers: {
                  "x-client-id": clientId,
                  "x-api-key": apiKey
                }
              });

              if (response.ok) {
                const result = await response.json();
                if (result.code === "00" && result.data && result.data.status === "PAID") {
                  paymentSuccess = true;
                  transactionDetails = {
                    payosOrderCode: Number(payosOrderCode),
                    payosStatus: "PAID"
                  };
                }
              }
            } catch (payosErr) {
              console.warn("PayOS verification failed, will attempt fallback:", payosErr.message);
            }
          }

          // FALLBACK: If PayOS check failed or was not configured, attempt checking SePay
          // This handles cases where the user paid directly to the bank account (shared MB account),
          // which is monitored by SePay.
          if (!paymentSuccess && env.SEPAY_API_TOKEN) {
            console.log(`Checking SePay fallback for PayOS code ${txCode}...`);
            try {
              const checkResult = await checkSePayHelper(env.SEPAY_API_TOKEN, amount, txCode);
              if (checkResult.success) {
                paymentSuccess = true;
                transactionDetails = checkResult.details;
                actualGateway = "sepay"; // Override to sepay in DB since it was processed via SePay
              }
            } catch (sepayErr) {
              console.warn("SePay fallback verification failed:", sepayErr.message);
            }
          }
        } else {
          return new Response(JSON.stringify({ success: false, error: "Invalid gateway specified." }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        // If gateway hasn't received payment, return failure response
        if (!paymentSuccess) {
          return new Response(JSON.stringify({ success: false, message: "Hệ thống chưa nhận được khoản thanh toán." }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        // 2. Payment verified! Now update Firestore securely using Google REST APIs
        if (!env.FIREBASE_PROJECT_ID || !env.FIREBASE_CLIENT_EMAIL || !env.FIREBASE_PRIVATE_KEY) {
          return new Response(JSON.stringify({ success: false, error: "Firebase Service Account is not fully configured on Cloudflare." }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        // a. Exchange credentials for Google OAuth Access Token
        const token = await getFirebaseAuthToken(env.FIREBASE_CLIENT_EMAIL, env.FIREBASE_PRIVATE_KEY);

        // b. Check if payment record already exists and is completed
        const checkUrl = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/payments/${txCode}`;
        const checkResponse = await fetch(checkUrl, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });

        let docExists = false;
        let checkData = null;
        if (checkResponse.ok) {
          docExists = true;
          checkData = await checkResponse.json();
          const currentStatus = checkData.fields?.status?.stringValue;
          if (currentStatus === "completed" || currentStatus === "success") {
            return new Response(JSON.stringify({ success: true, message: "Giao dịch này đã được xử lý và cộng tiền từ trước!" }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }
        }

        // c. Retrieve user's current profile to get current balance and email
        const userUrl = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${userId}`;
        const userResponse = await fetch(userUrl, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });

        if (!userResponse.ok) {
          const errText = await userResponse.text();
          throw new Error(`Failed to fetch user profile: ${userResponse.status} - ${errText}`);
        }

        const userData = await userResponse.json();
        const currentBalance = Number(userData.fields?.balance?.integerValue || userData.fields?.balance?.doubleValue || 0);
        const newBalance = currentBalance + Number(amount);
        const userEmail = userData.fields?.email?.stringValue || "N/A";

        // d. Update the user balance in Firestore (PATCH only balance field)
        const userUpdateData = {
          fields: {
            ...userData.fields,
            balance: { integerValue: String(newBalance) }
          }
        };

        const userUpdateResponse = await fetch(`${userUrl}?updateMask.fieldPaths=balance`, {
          method: "PATCH",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(userUpdateData)
        });

        if (!userUpdateResponse.ok) {
          const errText = await userUpdateResponse.text();
          throw new Error(`Failed to update user balance: ${userUpdateResponse.status} - ${errText}`);
        }

        // e. Write payment record to Firestore
        const paymentData = {
          fields: {
            userId: { stringValue: userId },
            userEmail: { stringValue: userEmail },
            amount: { doubleValue: Number(amount) },
            txCode: { stringValue: txCode },
            gateway: { stringValue: actualGateway },
            status: { stringValue: "completed" },
            createdAt: { stringValue: docExists ? (checkData.fields?.createdAt?.stringValue || new Date().toISOString()) : new Date().toISOString() }
          }
        };

        if (transactionDetails.sepayTransactionId) {
          paymentData.fields.sepayTransactionId = { stringValue: transactionDetails.sepayTransactionId };
          paymentData.fields.bankBrand = { stringValue: transactionDetails.bankBrand };
          paymentData.fields.referenceNumber = { stringValue: transactionDetails.referenceNumber };
        } else if (transactionDetails.payosStatus) {
          paymentData.fields.payosOrderCode = { integerValue: String(transactionDetails.payosOrderCode) };
          paymentData.fields.payosStatus = { stringValue: transactionDetails.payosStatus };
        }

        // If document exists, we patch status, gateway, and metadata only. Otherwise write all fields.
        let patchUrl = checkUrl;
        if (docExists) {
          const maskPaths = ["status", "gateway", "sepayTransactionId", "bankBrand", "referenceNumber", "payosOrderCode", "payosStatus"];
          patchUrl += "?" + maskPaths.map(p => `updateMask.fieldPaths=${p}`).join("&");
        }

        const paymentUpdateResponse = await fetch(patchUrl, {
          method: "PATCH",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(paymentData)
        });

        if (!paymentUpdateResponse.ok) {
          const errText = await paymentUpdateResponse.text();
          throw new Error(`Failed to save payment details: ${paymentUpdateResponse.status} - ${errText}`);
        }

        return new Response(JSON.stringify({ success: true, message: "Nạp tiền thành công!" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });

      } catch (err) {
        return new Response(JSON.stringify({ success: false, error: err.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    return new Response("Not Found", { status: 404 });
  }
};

// --- SePay transaction checker helper ---
async function checkSePayHelper(apiToken, amount, txCode) {
  const response = await fetch("https://my.sepay.vn/userapi/transactions/list?limit=20", {
    headers: {
      "Authorization": `Bearer ${apiToken}`,
      "Content-Type": "application/json"
    }
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`SePay API returned error status ${response.status}: ${errText}`);
  }

  const data = await response.json();
  if (!data?.transactions || !Array.isArray(data.transactions)) {
    throw new Error("Invalid response format from SePay API");
  }

  // Find a matching transaction
  const matchedTx = data.transactions.find(tx => {
    const matchesAmount = Number(tx.amount_in) === Number(amount);
    const matchesContent = (tx.transaction_content || "").includes(txCode) || (tx.body || "").includes(txCode);
    return matchesAmount && matchesContent;
  });

  if (matchedTx) {
    return {
      success: true,
      details: {
        sepayTransactionId: String(matchedTx.id),
        bankBrand: matchedTx.bank_brand_name || "N/A",
        referenceNumber: matchedTx.reference_number || "N/A"
      }
    };
  }

  return { success: false };
}

// --- Google Authentication OAuth helper functions using Web Crypto API ---

async function getFirebaseAuthToken(clientEmail, privateKey) {
  const jwt = await signJWT(clientEmail, privateKey);

  // Exchange JWT for OAuth Access Token
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt
    })
  });

  if (!tokenResponse.ok) {
    const errText = await tokenResponse.text();
    throw new Error(`Failed to exchange JWT for access token: ${errText}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

async function signJWT(clientEmail, privateKeyPEM) {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/datastore",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now
  };

  const headerB64 = await objectToBase64url(header);
  const claimB64 = await objectToBase64url(claim);
  const tokenInput = `${headerB64}.${claimB64}`;

  // Robustly clean the PEM private key structure
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";

  let cleanedKey = privateKeyPEM
    .replace(pemHeader, "")
    .replace(pemFooter, "")
    .replace(/\s+/g, "") // remove all whitespace/newlines
    .replace(/\\n/g, "") // remove literal \n text characters
    .replace(/["']/g, ""); // remove double/single quotes

  // Convert raw base64 string to ArrayBuffer
  const binaryKey = str2ab(atob(cleanedKey));
  
  // Import key
  const key = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: { name: "SHA-256" }
    },
    false,
    ["sign"]
  );

  // Sign token
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(tokenInput)
  );

  const signatureB64 = arrayBufferToBase64url(signature);
  return `${tokenInput}.${signatureB64}`;
}

async function objectToBase64url(obj) {
  return arrayBufferToBase64url(new TextEncoder().encode(JSON.stringify(obj)));
}

function arrayBufferToBase64url(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function str2ab(str) {
  const buf = new ArrayBuffer(str.length);
  const bufView = new Uint8Array(buf);
  for (let i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}
