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

const fetch = require("node-fetch"); // 🧠 Required to make API calls to Shopify Admin

app.post("/verify-otp", async (req, res) => {
  const { phone, code } = req.body;
  const formattedPhone = formatIndianPhone(phone);

  if (!formattedPhone || !code) {
    return res.status(400).send({ success: false, message: "Phone or OTP missing" });
  }

  try {
    // 🔐 Verify OTP via Twilio
    const verification = await client.verify
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks.create({ to: formattedPhone, code });

    if (verification.status !== "approved") {
      return res.status(400).send({ success: false, message: "Invalid OTP" });
    }

    // ✅ OTP is verified — now search or create Shopify customer
    const shop = process.env.SHOPIFY_STORE_DOMAIN;
    const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
    const headers = {
      "X-Shopify-Access-Token": token,
      "Content-Type": "application/json"
    };

    // 🕵️ Search customer by phone
    const searchRes = await fetch(`https://${shop}/admin/api/2023-10/customers/search.json?query=phone:${formattedPhone}`, {
      method: "GET",
      headers
    });
    const searchData = await searchRes.json();
    let customer = searchData.customers[0];

    if (!customer) {
      // 🆕 Create new customer + send activation email
      const fakeEmail = `${formattedPhone.replace('+91', '')}@yourdomain.com`;

      const createRes = await fetch(`https://${shop}/admin/api/2023-10/customers.json`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          customer: {
            phone: formattedPhone,
            email: fakeEmail,
            tags: "otp-login",
            send_email_invite: true // 🎉 triggers activation link email
          }
        })
      });

      const createData = await createRes.json();
      customer = createData.customer;
    }

    // 🎯 Send response with redirect to Shopify login
    res.status(200).send({
      success: true,
      message: "OTP verified. Activation email sent if new customer.",
      redirect: "/account/login"
    });

  } catch (err) {
    console.error("OTP verification or Shopify error:", err.message);
    res.status(500).send({ success: false, message: "OTP or customer handling failed." });
  }
});


// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`OTP service running on port ${PORT}`));
