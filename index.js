const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

// Dummy OTP verification function (replace with actual logic)
const verifyOTP = (phone, otp) => {
  return otp === "123456"; // 🔐 Replace with your actual OTP logic
};

// 👉 Shopify config
const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN; // your-store.myshopify.com
const SHOPIFY_API_KEY = process.env.SHOPIFY_ADMIN_API_PASSWORD;

// ✅ OTP LOGIN endpoint
app.post("/otp-login", async (req, res) => {
  const { phone, otp } = req.body;

  if (!phone || !otp) {
    return res.status(400).json({ error: "Phone and OTP are required" });
  }

  // 1️⃣ Verify OTP
  if (!verifyOTP(phone, otp)) {
    return res.status(401).json({ error: "Invalid OTP" });
  }

  try {
    // 2️⃣ Check if customer exists
    const searchRes = await axios.get(
      `https://${SHOPIFY_DOMAIN}/admin/api/2023-10/customers/search.json?query=phone:${phone}`,
      {
        headers: {
          "X-Shopify-Access-Token": SHOPIFY_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    if (searchRes.data.customers && searchRes.data.customers.length > 0) {
      return res.json({
        message: "Customer exists. Logged in successfully.",
        customer: searchRes.data.customers[0],
      });
    }

    // 3️⃣ Create new customer (Shopify requires email)
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

    return res.json({
      message: "Customer created and logged in.",
      customer: createRes.data.customer,
    });
  } catch (err) {
    console.error("❌ Shopify error:", err.response?.data || err.message);
    return res.status(500).json({ error: "Server error during login process" });
  }
});

app.get("/", (req, res) => {
  res.send("✅ OTP Login API is running");
});

app.listen(port, () => {
  console.log(`🚀 Server is running at http://localhost:${port}`);
});
