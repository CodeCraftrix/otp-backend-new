const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const twilio = require("twilio");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Twilio setup
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

app.use(cors());
app.use(bodyParser.json());

// Send OTP
app.post("/send-otp", async (req, res) => {
  const { phone } = req.body;

  try {
    const verification = await twilioClient.verify.v2
      .services(serviceSid)
      .verifications.create({ to: phone, channel: "sms" });

    res.status(200).json({ success: true, message: "OTP sent", sid: verification.sid });
  } catch (err) {
    console.error("❌ Error sending OTP:", err);
    res.status(err.status || 500).json({ success: false, message: "Failed to send OTP" });
  }
});

// Verify OTP
app.post("/verify-otp", async (req, res) => {
  const { phone, code } = req.body;

  try {
    const verificationCheck = await twilioClient.verify.v2
      .services(serviceSid)
      .verificationChecks.create({ to: phone, code });

   if (verificationCheck.status === "approved") {
  // Call the Shopify customer create/login API
  const axios = require("axios");

  try {
    const response = await axios.post("http://localhost:5001/verify-and-login", { phone });
    return res.status(200).json({
      success: true,
      message: "OTP verified and customer login successful",
      customer: response.data.customer,
    });
  } catch (err) {
    console.error("❌ Error linking Shopify customer:", err.response?.data || err.message);
    return res.status(500).json({ success: false, message: "OTP verified but failed to login to Shopify" });
  }
}
 else {
      res.status(400).json({ success: false, message: "Invalid OTP" });
    }
  } catch (err) {
    console.error("❌ Error verifying OTP:", err);
    res.status(err.status || 500).json({ success: false, message: "Failed to verify OTP" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ OTP Server running at http://localhost:${PORT}`);
});
