const express = require("express");
const bodyParser = require("body-parser");
const twilio = require("twilio");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Twilio Client
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Format phone number to E.164 (+91XXXXXXXXXX)
function formatPhone(phone) {
  const cleaned = phone.replace(/\D/g, ""); // remove all non-digit characters
  return cleaned.startsWith("91") ? `+${cleaned}` : `+91${cleaned}`;
}

// Send OTP
app.post("/send-otp", async (req, res) => {
  const { phone } = req.body;
  const formattedPhone = formatPhone(phone);

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

// Verify OTP + Create/Find Shopify Customer
app.post("/verify-otp", async (req, res) => {
  const { phone, code } = req.body;
  const formattedPhone = formatPhone(phone);

  try {
    // Step 1: Verify OTP
    const verification = await client.verify
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks.create({ to: formattedPhone, code });

    if (verification.status !== "approved") {
      return res.status(400).send({ success: false, message: "Invalid OTP" });
    }

    // Step 2: Search for customer in Shopify
    const headers = {
      "X-Shopify-Access-Token": process.env.SHOPIFY_ADMIN_ACCESS_TOKEN,
      "Content-Type": "application/json",
    };

    const searchUrl = `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2023-10/customers/search.json?query=phone:${formattedPhone}`;
    const searchResponse = await axios.get(searchUrl, { headers });

    let customer = searchResponse.data.customers[0];

    if (!customer) {
      // Step 3: Create new customer
      const createUrl = `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2023-10/customers.json`;

      const newCustomer = {
        customer: {
          phone: formattedPhone,
          tags: "OTP Login",
          accepts_marketing: false,
        },
      };

      const createResponse = await axios.post(createUrl, newCustomer, {
        headers,
      });

      customer = createResponse.data.customer;
      console.log("✅ Created new customer:", customer.id);
    } else {
      console.log("✅ Found existing customer:", customer.id);
    }

    // Step 4: Success response
    res.status(200).send({ success: true, customer });

  } catch (err) {
    console.error("❌ OTP verify or Shopify error:", err.message);
    res.status(500).send({ success: false, message: err.message });
  }
});

// Start server
app.listen(5000, () => console.log("🚀 OTP service running on port 5000"));
