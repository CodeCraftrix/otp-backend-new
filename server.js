const express = require("express");
const bodyParser = require("body-parser");
const twilio = require("twilio");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(bodyParser.json());
app.use(cors());

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

app.post("/send-otp", async (req, res) => {
  const { phone } = req.body;
  try {
    await client.verify
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verifications.create({ to: `+91${phone}`, channel: "sms" });
    res.status(200).send({ success: true, message: "OTP sent" });
  } catch (err) {
    res.status(500).send({ success: false, message: err.message });
  }
});

app.post("/verify-otp", async (req, res) => {
  const { phone, code } = req.body;
  try {
    const verification = await client.verify
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks.create({ to: `+91${phone}`, code });

    if (verification.status === "approved") {
      res.status(200).send({ success: true });
    } else {
      res.status(400).send({ success: false, message: "Invalid OTP" });
    }
  } catch (err) {
    res.status(500).send({ success: false, message: err.message });
  }
});

app.listen(5000, () => console.log("OTP service running on port 5000"));
