const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const shop = process.env.SHOPIFY_STORE_DOMAIN;
const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

app.post("/verify-user", async (req, res) => {
  const { phone } = req.body;

  try {
    // Check if customer already exists
    const existing = await axios.get(
      `https://${shop}/admin/api/2023-10/customers/search.json?query=phone:+91${phone}`,
      {
        headers: {
          "X-Shopify-Access-Token": token,
        },
      }
    );

    let customer;

    if (existing.data.customers.length > 0) {
      customer = existing.data.customers[0];
    } else {
      // Create new customer with phone
      const created = await axios.post(
        `https://${shop}/admin/api/2023-10/customers.json`,
        {
          customer: {
            phone: `+91${phone}`,
            tags: "Phone Login",
            verified_email: true,
            email: `${phone}@yourstore.com`, // dummy email to make Shopify happy
          },
        },
        {
          headers: {
            "X-Shopify-Access-Token": token,
            "Content-Type": "application/json",
          },
        }
      );
      customer = created.data.customer;
    }

    // Store customer ID in frontend (via cookie/localStorage)
    res.send({ success: true, customer });
  } catch (err) {
    res.status(500).send({ success: false, message: err.message });
  }
});
app.post("/get-customer-details", async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res
      .status(400)
      .json({ success: false, message: "Phone number missing" });
  }

  try {
    const formattedPhone = phone.startsWith("+91") ? phone : `+91${phone}`;

    const response = await axios.get(
      `https://${shop}/admin/api/2023-10/customers/search.json?query=phone:${formattedPhone}`,
      {
        headers: {
          "X-Shopify-Access-Token": token,
          "Content-Type": "application/json",
        },
      }
    );

    const customer = response.data.customers[0];

    if (!customer) {
      return res
        .status(404)
        .json({ success: false, message: "Customer not found" });
    }

    res.status(200).json({ success: true, customer });
  } catch (err) {
    console.error("Error fetching customer details:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.listen(5001, () => console.log("Customer creation running on port 5001"));
