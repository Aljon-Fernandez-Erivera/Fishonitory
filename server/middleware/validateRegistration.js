const validateRegistration = (req, res, next) => {
  const { businessName, ownerName, email, password, businessAddress, phoneNumber, otp } = req.body;

  // 1. businessName (only if provided)
  if (businessName) {
    const noSymbolsRegex = /^[a-zA-Z0-9\s]+$/;
    if (!noSymbolsRegex.test(businessName)) {
      return res.status(400).json({ message: 'Business name must not contain special symbols.' });
    }
  }

  // 2. ownerName (only if provided)
  if (ownerName) {
    const noSymbolsRegex = /^[a-zA-Z0-9\s]+$/;
    if (!noSymbolsRegex.test(ownerName)) {
      return res.status(400).json({ message: 'Owner name must not contain special symbols.' });
    }
  }

  // 3. email (required for both routes)
  if (email) {
    const emailSymbolRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailSymbolRegex.test(email)) {
      return res.status(400).json({ message: 'Email contains invalid symbols or format.' });
    }
  }

  // 4. password (only if provided)
  if (password) {
    const passwordAllowedSymbolsRegex = /^[a-zA-Z0-9@#$!]+$/;
    if (!passwordAllowedSymbolsRegex.test(password)) {
      return res.status(400).json({ message: 'Password contains illegal symbols. Only @, #, $, and ! are allowed.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    }
  }

  // 5. businessAddress (only if provided)
  if (businessAddress) {
    const addressAllowedSymbolsRegex = /^[a-zA-Z0-9\s\-,.#]+$/;
    if (!addressAllowedSymbolsRegex.test(businessAddress)) {
      return res.status(400).json({ message: 'Business address contains invalid symbols. Only -, comma, period, and # are allowed.' });
    }
  }

  // 6. phoneNumber (only if provided)
  if (phoneNumber) {
    const phoneAllowedSymbolsRegex = /^\+?[0-9\-]+$/;
    if (!phoneAllowedSymbolsRegex.test(phoneNumber)) {
      return res.status(400).json({ message: 'Phone number contains invalid symbols. Only digits, +, and - are allowed.' });
    }
  }

  // 7. OTP validation (if provided)
  if (otp && (!/^\d{6}$/.test(String(otp)))) {
    return res.status(400).json({ message: 'OTP must be a 6-digit integer.' });
  }

  next();
};

module.exports = validateRegistration;
