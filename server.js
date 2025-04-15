const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const twilio = require("twilio");
const { handleCustomerLogin } = require("./index"); // ✅ Make sure index.js exports this

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

    res.status(200).json({ success: true, message: "OTP sent" });
  } catch (err) {
    console.error("Error sending OTP:", err.message);
    res.status(500).json({ success: false, message: "Failed to send OTP" });
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
      // ✅ Call Shopify logic after OTP is verified
      const result = await handleCustomerLogin(phone);

      res.status(200).json({
        success: true,
        message: "OTP verified and customer handled",
        customer: result,
      });
    } else {
      res.status(400).json({ success: false, message: "Invalid OTP" });
    }
  } catch (err) {
    console.error("Error verifying OTP:", err.message);
    res.status(500).json({ success: false, message: "Failed to verify OTP" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
