// index.js
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const axios = require("axios");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(bodyParser.json());

app.post("/verify-and-login", async (req, res) => {
  const { phone } = req.body;

  try {
    const customerSearch = await axios.get(
      `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2023-10/customers/search.json?query=phone:${encodeURIComponent(phone)}`,
      {
        headers: {
          "X-Shopify-Access-Token": process.env.SHOPIFY_ADMIN_ACCESS_TOKEN,
          "Content-Type": "application/json",
        },
      }
    );

    let customer = customerSearch.data.customers[0];

    if (!customer) {
      const formattedPhone = phone.replace(/\D/g, '');
      const customerCreate = await axios.post(
        `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2023-10/customers.json`,
        {
          customer: {
            first_name: "OTP",
            last_name: "Login",
            email: `${formattedPhone}@otp-login.com`,
            phone: phone,
            verified_email: true,
            accepts_marketing: false,
            tags: "OTP Login, Phone Login",
          },
        },
        {
          headers: {
            "X-Shopify-Access-Token": process.env.SHOPIFY_ADMIN_ACCESS_TOKEN,
            "Content-Type": "application/json",
          },
        }
      );

      customer = customerCreate.data.customer;
    }

    res.status(200).json({
      success: true,
      customer,
      message: "Customer verified and found/created",
    });
  } catch (err) {
    console.error("❌ Error creating/finding customer:", err.response?.data || err.message);
    res.status(500).json({
      success: false,
      message: "Failed to create/find customer",
    });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Customer backend running on http://localhost:${PORT}`);
});
