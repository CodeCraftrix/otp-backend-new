const express = require("express");
const bodyParser = require("body-parser");
const twilio = require("twilio");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Twilio Client setup
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// ✅ Utility function to normalize phone numbers to E.164 format for India
function formatIndianPhone(phone) {
  if (!phone) return null;
  phone = phone.toString().trim();
  phone = phone.replace(/^(\+91|0)/, ''); // remove +91 or 0 if present
  return `+91${phone}`;
}

// ✅ Route to send OTP
app.post("/send-otp", async (req, res) => {
  const { phone } = req.body;
  const formattedPhone = formatIndianPhone(phone);

  if (!formattedPhone) {
    return res.status(400).send({ success: false, message: "Invalid phone number" });
  }

  try {
    await client.verify
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verifications.create({ to: formattedPhone, channel: "sms" });

    res.status(200).send({ success: true, message: "OTP sent" });
  } catch (err) {
    console.error("Error sending OTP:", err.message);
    res.status(500).send({ success: false, message: err.message });
  }
});

// ✅ Route to verify OTP
const axios = require("axios");

// Verify OTP route
app.post("/verify-otp", async (req, res) => {
  const { phone, code } = req.body;
  const formattedPhone = formatIndianPhone(phone);

  if (!formattedPhone || !code) {
    return res.status(400).send({ success: false, message: "Phone or OTP missing" });
  }

  try {
    // Step 1: Verify OTP
    const verification = await client.verify
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks.create({ to: formattedPhone, code });

    if (verification.status !== "approved") {
      return res.status(400).send({ success: false, message: "Invalid OTP" });
    }

    // Step 2: Check if customer already exists
    const searchUrl = `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2023-10/customers/search.json?query=phone:${formattedPhone}`;
    const headers = {
      "X-Shopify-Access-Token": process.env.SHOPIFY_ADMIN_ACCESS_TOKEN,
      "Content-Type": "application/json",
    };

    const searchResponse = await axios.get(searchUrl, { headers });

    let customer = searchResponse.data.customers[0];

    // Step 3: If customer doesn't exist, create one
    if (!customer) {
      const createUrl = `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2023-10/customers.json`;
      const createData = {
        customer: {
          phone: formattedPhone,
          tags: "OTP Login",
        },
      };

      const createResponse = await axios.post(createUrl, createData, { headers });
      customer = createResponse.data.customer;
    }

    // ✅ Customer exists or is now created – success
    res.status(200).send({
      success: true,
      message: "OTP verified and customer stored",
      customer,
    });
  } catch (err) {
    console.error("Error in OTP verification or Shopify customer handling:", err.message);
    res.status(500).send({ success: false, message: err.message });
  }
});

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`OTP service running on port ${PORT}`));
