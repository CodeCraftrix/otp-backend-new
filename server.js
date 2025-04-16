const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const twilio = require("twilio");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// ✅ Helper to format phone
const formatPhone = (phone) => {
  let formatted = phone.trim();
  if (formatted.startsWith("+91")) return formatted;
  if (formatted.startsWith("91")) return `+${formatted}`;
  return `+91${formatted}`;
};

// ✅ Send OTP
app.post("/send-otp", async (req, res) => {
  const { phone } = req.body;
  const toPhone = formatPhone(phone);

  try {
    const response = await client.verify
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verifications.create({ to: toPhone, channel: "sms" });

    console.log("OTP Sent:", response.sid);
    res.status(200).send({ success: true, message: "OTP sent" });
  } catch (err) {
    console.error("Send OTP Error:", err.message);
    res.status(500).send({ success: false, message: err.message });
  }
});

// ✅ Verify OTP and create customer in Shopify
app.post("/verify-otp", async (req, res) => {
  const { phone, code } = req.body;
  const toPhone = formatPhone(phone);

  try {
    const verification = await client.verify
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks.create({ to: toPhone, code });

    if (verification.status !== "approved") {
      return res.status(401).send({ success: false, message: "Invalid OTP" });
    }

    // ✅ Shopify: Check if customer exists
    const searchUrl = `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2023-10/customers/search.json?query=phone:${toPhone}`;
    const headers = {
      "X-Shopify-Access-Token": process.env.SHOPIFY_ADMIN_ACCESS_TOKEN,
      "Content-Type": "application/json",
    };

    const searchResponse = await axios.get(searchUrl, { headers });
    const existingCustomers = searchResponse.data.customers;

    let customer;
    if (existingCustomers.length > 0) {
      customer = existingCustomers[0];
    } else {
      // ✅ Create customer
      const createUrl = `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2023-10/customers.json`;
      const payload = {
        customer: {
          phone: toPhone,
          tags: "OTP Login",
          verified_email: false,
          send_email_welcome: false,
        },
      };

      const createResponse = await axios.post(createUrl, payload, { headers });
      customer = createResponse.data.customer;
    }

    // ✅ Send back customer ID
    res.status(200).send({ success: true, customer });
  } catch (err) {
    console.error("Verify OTP Error:", err.response?.data || err.message);
    res.status(500).send({
      success: false,
      message: err.response?.data?.error || err.message,
    });
  }
});

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`OTP service running on port ${PORT}`));
