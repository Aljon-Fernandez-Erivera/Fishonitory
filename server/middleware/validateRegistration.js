const { email, password, phone, string, validate } = require("./validateInput");

module.exports = validate((req) => {
  const body = req.body || {};
  const route = req.path;

  if (route === "/send-otp") {
    email(body.email);
    return;
  }

  if (route === "/login") {
    email(body.email);
    string(body.password, "Password", { min: 1, max: 128 });
    return;
  }

  if (route === "/password-reset/request") {
    email(body.email);
    return;
  }

  if (route === "/password-reset/confirm") {
    email(body.email);
    password(body.password);
    if (!/^\d{6}$/.test(String(body.otp || ""))) {
      throw Object.assign(new Error("Please enter the 6-digit reset code."), { statusCode: 400 });
    }
    return;
  }

  email(body.email);
  string(body.businessName, "Business name", { min: 3, max: 100 });
  string(body.ownerName, "Owner name", { min: 2, max: 100 });
  password(body.password);
  string(body.businessAddress, "Business address", { min: 5, max: 255 });
  phone(body.phoneNumber);

  if (!/^\d{6}$/.test(String(body.otp || ""))) {
    throw Object.assign(new Error("OTP must be a 6-digit number."), {
      statusCode: 400,
    });
  }
});
