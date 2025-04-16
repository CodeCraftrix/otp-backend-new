// server.js
const express = require("express");
const bodyParser = require("body-parser");
const twilio = require("twilio");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(bodyParser.json());
app.use(cors());

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const formatPhone = (phone) => {
  // Ensure number is properly formatted: +91XXXXXXXXXX
  if (!phone.startsWith("+")) {
    if (phone.startsWith("91")) return `+${phone}`;
    return `+91${phone}`;
  }
  return phone;
};

// Send OTP
app.post("/send-otp", async (req, res) => {
  const { phone } = req.body;
  const formattedPhone = formatPhone(phone);
  console.log("Sending OTP to:", formattedPhone);
  try {
    await client.verify
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verifications.create({ to: formattedPhone, channel: "sms" });
    res.status(200).send({ success: true, message: "OTP sent" });
  } catch (err) {
    console.error("❌ Error sending OTP:", err.message);
    res.status(500).send({ success: false, message: err.message });
  }
});

// Verify OTP and create customer if not exists
app.post("/verify-otp", async (req, res) => {
  const { phone, code } = req.body;
  const formattedPhone = formatPhone(phone);

  try {
    const verification = await client.verify
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks.create({ to: formattedPhone, code });

    if (verification.status === "approved") {
      const searchUrl = `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2023-10/customers/search.json?query=phone:${formattedPhone}`;

      const headers = {
        "X-Shopify-Access-Token": process.env.SHOPIFY_ADMIN_ACCESS_TOKEN,
        "Content-Type": "application/json",
      };

      // Step 2: Check if customer exists
      const searchResponse = await axios.get(searchUrl, { headers });
      const customers = searchResponse.data.customers;

      if (customers.length > 0) {
        // Customer exists
        console.log("✅ Customer already exists:", customers[0].id);
        res.status(200).send({ success: true, customer: customers[0] });
      } else {
        // Step 3: Create customer
        const createUrl = `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2023-10/customers.json`;
        const newCustomerData = {
          customer: {
            phone: formattedPhone,
            verified_email: true,
            tags: "Phone OTP Login",
            accepts_marketing: false,
          },
        };

        const createResponse = await axios.post(createUrl, newCustomerData, { headers });
        console.log("✅ Customer created:", createResponse.data.customer.id);
        res.status(200).send({ success: true, customer: createResponse.data.customer });
      }
    } else {
      res.status(400).send({ success: false, message: "Invalid OTP" });
    }
  } catch (err) {
    console.error("❌ OTP verification failed:", err.message);
    res.status(401).send({ success: false, message: err.message });
  }
});

app.listen(5000, () => console.log("🚀 OTP backend running on http://localhost:5000"));
