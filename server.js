const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const twilio = require("twilio");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// 🔐 Twilio setup
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID;
const client = twilio(accountSid, authToken);

// 🛍 Shopify setup
const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const SHOPIFY_API_KEY = process.env.SHOPIFY_ADMIN_API_PASSWORD;

// 🚀 Send OTP
app.post("/send-otp", async (req, res) => {
  const { phone } = req.body;
  try {
    const verification = await client.verify.v2
      .services(verifySid)
      .verifications.create({ to: phone, channel: "sms" });
    res.status(200).send({ success: true });
  } catch (error) {
    console.error("OTP send error:", error.message);
    res.status(400).send({ success: false, message: error.message });
  }
});

// ✅ Verify OTP and login to Shopify
app.post("/verify-otp", async (req, res) => {
  const { phone, code } = req.body;

  try {
    // 🔎 Check OTP
    const verification_check = await client.verify.v2
      .services(verifySid)
      .verificationChecks.create({ to: phone, code });

    if (verification_check.status !== "approved") {
      return res.send({ success: false, message: "Invalid OTP" });
    }

    // 🔍 Search Shopify customer by phone
    const searchRes = await axios.get(
      `https://${SHOPIFY_DOMAIN}/admin/api/2023-10/customers/search.json?query=phone:${phone}`,
      {
        headers: {
          "X-Shopify-Access-Token": SHOPIFY_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    if (searchRes.data.customers.length > 0) {
      return res.send({
        success: true,
        customer: searchRes.data.customers[0],
        message: "Customer exists. Logged in.",
      });
    }

    // 🆕 Create customer if not found
    const fakeEmail = `${phone.replace(/[^\d]/g, "")}@otplogin.fake`;
    const createRes = await axios.post(
      `https://${SHOPIFY_DOMAIN}/admin/api/2023-10/customers.json`,
      {
        customer: {
          phone: phone,
          email: fakeEmail,
          tags: "OTP Login",
          verified_email: true,
        },
      },
      {
        headers: {
          "X-Shopify-Access-Token": SHOPIFY_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    return res.send({
      success: true,
      customer: createRes.data.customer,
      message: "New customer created and logged in.",
    });
  } catch (error) {
    const shopifyError =
      error.response?.data || error.message || "Unknown error";
    console.error("🔴 Shopify login error:", shopifyError);

    res.status(500).send({
      success: false,
      message: "Server error during login",
      error: shopifyError, // helpful for frontend/dev logs
    });
  }
});

// 🌐 Health check
app.get("/", (req, res) => {
  res.send("🚀 OTP + Shopify Backend Running");
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
