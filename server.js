const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const twilio = require("twilio");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// 👇 Configure CORS properly
app.use(
  cors({
    origin: ["https://vrvdxi-p0.myshopify.com"], // ✅ replace with your Shopify store domain
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);

app.use(bodyParser.json());

// ✅ Twilio setup
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

// ✅ Send OTP route
app.post("/send-otp", async (req, res) => {
  const { phone } = req.body;
  try {
    const verification = await twilioClient.verify.v2
      .services(serviceSid)
      .verifications.create({ to: phone, channel: "sms" });

    res.status(200).json({ success: true, sid: verification.sid });
  } catch (err) {
    console.error("❌ OTP SEND ERROR:", err);
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
});

// ✅ Verify OTP route
app.post("/verify-otp", async (req, res) => {
  const { phone, code } = req.body;
  try {
    const verificationCheck = await twilioClient.verify.v2
      .services(serviceSid)
      .verificationChecks.create({ to: phone, code });

    if (verificationCheck.status === "approved") {
      res.status(200).json({ success: true, message: "OTP verified" });
    } else {
      res.status(400).json({ success: false, message: "Invalid OTP" });
    }
  } catch (err) {
    console.error("❌ OTP VERIFY ERROR:", err);
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
});

app.listen(PORT, () => {
  console.log(✅ Server running at http://localhost:${PORT});
});
