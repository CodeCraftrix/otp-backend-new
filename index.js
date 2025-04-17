const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const axios = require("axios");

const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_VERIFY_SERVICE_SID,
  SHOPIFY_ADMIN_ACCESS_TOKEN,
  SHOPIFY_STORE_DOMAIN,
} = process.env;

// ========== 1. VERIFY OTP + LOGIN ==========
app.post("/verify-otp-and-login", async (req, res) => {
  const { phone, code } = req.body;

  try {
    // 1. Verify OTP via Twilio
    const verifyUrl = `https://verify.twilio.com/v2/Services/${TWILIO_VERIFY_SERVICE_SID}/VerificationCheck`;
    const verifyResponse = await axios.post(
      verifyUrl,
      new URLSearchParams({
        To: phone,
        Code: code,
      }),
      {
        auth: {
          username: TWILIO_ACCOUNT_SID,
          password: TWILIO_AUTH_TOKEN,
        },
      }
    );

    const verificationStatus = verifyResponse.data.status;
    if (verificationStatus !== "approved") {
      return res.status(401).json({ success: false, message: "Invalid OTP" });
    }

    // 2. Check if customer already exists in Shopify
    const searchUrl = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/2023-10/customers/search.json?query=phone:${encodeURIComponent(
      phone
    )}`;
    const searchResponse = await axios.get(searchUrl, {
      headers: {
        "X-Shopify-Access-Token": SHOPIFY_ADMIN_ACCESS_TOKEN,
        "Content-Type": "application/json",
      },
    });

    let customer = searchResponse.data.customers[0];

    // 3. If not found, create the customer
    if (!customer) {
      const createResponse = await axios.post(
        `https://${SHOPIFY_STORE_DOMAIN}/admin/api/2023-10/customers.json`,
        {
          customer: {
            phone: phone,
            tags: "OTP_Login",
            verified_email: true,
            accepts_marketing: false,
          },
        },
        {
          headers: {
            "X-Shopify-Access-Token": SHOPIFY_ADMIN_ACCESS_TOKEN,
            "Content-Type": "application/json",
          },
        }
      );
      customer = createResponse.data.customer;
    }

    // 4. Success – return data to frontend
    res.json({
      success: true,
      customer: {
        id: customer.id,
        phone: customer.phone,
        first_name: customer.first_name,
        last_name: customer.last_name,
        email: customer.email,
      },
    });
  } catch (error) {
    console.error("OTP + Login Error:", error.response?.data || error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ========== 2. START SERVER ==========
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});
