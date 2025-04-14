const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const twilio = require("twilio");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID;
const client = twilio(accountSid, authToken);

app.post("/send-otp", async (req, res) => {
  const { phone } = req.body;
  try {
    const verification = await client.verify.v2
      .services(verifySid)
      .verifications.create({ to: phone, channel: "sms" });
    res.status(200).send({ success: true });
  } catch (error) {
    res.status(400).send({ success: false, message: error.message });
  }
});

app.post("/verify-otp", async (req, res) => {
  const { phone, code } = req.body;
  try {
    const verification_check = await client.verify.v2
      .services(verifySid)
      .verificationChecks.create({ to: phone, code });

    if (verification_check.status === "approved") {
      res.send({ success: true });
    } else {
      res.send({ success: false, message: "Invalid OTP" });
    }
  } catch (error) {
    res.status(400).send({ success: false, message: error.message });
  }
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
