const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const dotenv = require("dotenv");
const axios = require("axios");
const twilio = require("twilio");

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Twilio Setup
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

// Shopify Setup
const shopifyStore = process.env.SHOPIFY_STORE_DOMAIN;
const shopifyAccessToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

// --- SEND OTP ---
app.post("/send-otp", async (req, res) => {
  const { phone } = req.body;

  try {
    const verification = await twilioClient.verify.v2
      .services(serviceSid)
      .verifications.create({ to: phone, channel: "sms" });

    res.status(200).json({ success: true, message: "OTP sent", sid: verification.sid });
  } catch (err) {
    console.error("❌ OTP SEND ERROR:", err);
    res.status(500).json({ success: false, message: "Failed to send OTP" });
  }
});

// --- VERIFY OTP AND CREATE/LOGIN CUSTOMER ---
app.post("/verify-otp", async (req, res) => {
  const { phone, code } = req.body;

  try {
    const verification = await twilioClient.verify.v2
      .services(serviceSid)
      .verificationChecks.create({ to: phone, code });

    if (verification.status === "approved") {
      // Check if customer already exists
      const customerSearchRes = await axios.get(
        `https://${shopifyStore}/admin/api/2023-10/customers/search.json?query=phone:${encodeURIComponent(phone)}`,
        {
          headers: {
            "X-Shopify-Access-Token": shopifyAccessToken,
            "Content-Type": "application/json",
          },
        }
      );

      let customer = customerSearchRes.data.customers[0];

      // If customer does not exist, create it
      if (!customer) {
        const newCustomer = await axios.post(
          `https://${shopifyStore}/admin/api/2023-10/customers.json`,
          {
            customer: {
              phone: phone,
              verified_email: true,
              accepts_marketing: false,
            },
          },
          {
            headers: {
              "X-Shopify-Access-Token": shopifyAccessToken,
              "Content-Type": "application/json",
            },
          }
        );

        customer = newCustomer.data.customer;
      }

      res.status(200).json({
        success: true,
        message: "OTP verified, customer created/logged in",
        customer,
      });
    } else {
      res.status(400).json({ success: false, message: "Invalid OTP" });
    }
  } catch (err) {
    console.error("❌ OTP VERIFY ERROR:", err.message);
    res.status(500).json({ success: false, message: "Failed to verify OTP" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ OTP Auth Backend running at http://localhost:${PORT}`);
});
