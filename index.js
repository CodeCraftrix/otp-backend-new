const axios = require("axios");
const dotenv = require("dotenv");
dotenv.config();

// Load your Shopify credentials from .env
<<<<<<< HEAD
const SHOPIFY_ADMIN_API_URL = `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2023-10`;
=======
const SHOPIFY_ADMIN_API_URL = https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2023-10;
>>>>>>> 4de8fa1841b0f69e02ab3db66f23b2a624484103
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

// Main function used by server.js
async function handleCustomerLogin(phone) {
  try {
    // 🔍 Step 1: Search for existing customer by phone
    const searchUrl = `${SHOPIFY_ADMIN_API_URL}/customers/search.json?query=phone:${encodeURIComponent(
      phone
    )}`;
    const searchResponse = await axios.get(searchUrl, {
      headers: {
        "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
        "Content-Type": "application/json",
      },
    });

    const customers = searchResponse.data.customers;

    if (customers.length > 0) {
      console.log("✅ Customer found:", customers[0].id);
      return customers[0]; // return existing customer
    }

    // 🆕 Step 2: Create customer if not found
    const createResponse = await axios.post(
<<<<<<< HEAD
      `${SHOPIFY_ADMIN_API_URL}/customers.json`,
=======
      ${SHOPIFY_ADMIN_API_URL}/customers.json,
>>>>>>> 4de8fa1841b0f69e02ab3db66f23b2a624484103
      {
        customer: {
          phone: phone,
          tags: "OTP Login", // Optional: add a tag to identify
          verified_email: true,
          accepts_marketing: false,
        },
      },
      {
        headers: {
          "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ Customer created:", createResponse.data.customer.id);
    return createResponse.data.customer;
  } catch (error) {
    console.error("❌ Error in handleCustomerLogin:", error.message);
    throw error;
  }
}

module.exports = { handleCustomerLogin };
