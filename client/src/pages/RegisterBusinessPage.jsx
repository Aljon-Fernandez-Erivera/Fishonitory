import { useState } from 'react';

function RegisterBusinessPage() {
  const [formData, setFormData] = useState({
    businessName: '',
    ownerName: '',
    email: '',
    password: '',
    businessAddress: '',
    phoneNumber: '',
    otp: ''
  });

  const [step, setStep] = useState(1); // 1 = Details, 2 = OTP Verification
  const [errors, setErrors] = useState({});
  const [serverMessage, setServerMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let sanitizedValue = value;

    switch (name) {
      case 'businessName':
      case 'ownerName':
        sanitizedValue = value.replace(/[^a-zA-Z0-9\s]/g, '');
        break;
      case 'email':
        sanitizedValue = value.replace(/[^a-zA-Z0-9@._%+-]/g, '');
        break;
      case 'password':
        sanitizedValue = value.replace(/[^a-zA-Z0-9@#$!]/g, '');
        break;
      case 'businessAddress':
        sanitizedValue = value.replace(/[^a-zA-Z0-9\s\-,.#]/g, '');
        break;
      case 'phoneNumber':
        sanitizedValue = value.replace(/[^0-9+-]/g, '');
        break;
      case 'otp':
        sanitizedValue = value.replace(/\D/g, '').slice(0, 6);
        break;
      default:
        break;
    }

    setFormData((prev) => ({ ...prev, [name]: sanitizedValue }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validateDetails = () => {
    const newErrors = {};

    if (formData.businessName.length < 3) {
      newErrors.businessName = 'Business Name must be at least 3 characters.';
    }
    if (formData.ownerName.length < 2) {
      newErrors.ownerName = 'Owner Name must be at least 2 characters.';
    }
    if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = 'Please provide a valid email address.';
    }
    if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters.';
    }
    if (!formData.businessAddress) {
      newErrors.businessAddress = 'Business Address is required.';
    }
    if (!/^(09|\+639)\d{9}$/.test(formData.phoneNumber)) {
      newErrors.phoneNumber = 'Enter a valid Philippine phone number (e.g., 09123456789 or +639123456789).';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Step 1: Send OTP to email
  const handleSendOTP = async (e) => {
    e.preventDefault();
    setServerMessage('');

    if (!validateDetails()) return;

    setLoading(true);

    try {
      const response = await fetch('http://localhost:3000/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send OTP.');
      }

      setServerMessage(data.message);
      setStep(2); // Switch to OTP input step
    } catch (err) {
      setServerMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP & Create Account
  const handleVerifyAndRegister = async (e) => {
    e.preventDefault();
    setServerMessage('');

    if (formData.otp.length !== 6) {
      setErrors({ otp: 'Please enter a valid 6-digit OTP code.' });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('http://localhost:3000/api/auth/verify-and-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Verification failed.');
      }

      window.alert('Account created successfully! You can now log in.');
      window.location.href = '/';
    } catch (err) {
      setServerMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-card">
        <h1>Fishonitory</h1>
        <p>Register Your Ornamental Fish Store</p>
        <a href="/">Back to Home</a>
        
        {serverMessage && <p className="alert">{serverMessage}</p>}

        {step === 1 ? (
          /* STEP 1: FILL DETAILS & SEND OTP */
          <form onSubmit={handleSendOTP}>
            <div className="input-group">
              <label>Business / Store Name</label>
              <input
                type="text"
                name="businessName"
                value={formData.businessName}
                onChange={handleInputChange}
                maxLength={100}
                placeholder="e.g. AquaRealm Fish Shop"
                required
              />
              {errors.businessName && <span className="error">{errors.businessName}</span>}
            </div>

            <div className="input-group">
              <label>Owner Name</label>
              <input
                type="text"
                name="ownerName"
                value={formData.ownerName}
                onChange={handleInputChange}
                placeholder="e.g. Juan Cruz"
                required
              />
              {errors.ownerName && <span className="error">{errors.ownerName}</span>}
            </div>

            <div className="input-group">
              <label>Email Address</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="owner@store.com"
                required
              />
              {errors.email && <span className="error">{errors.email}</span>}
            </div>

            <div className="input-group">
              <label>Password (Allowed symbols: @ # $ !)</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="At least 8 characters"
                required
              />
              {errors.password && <span className="error">{errors.password}</span>}
            </div>

            <div className="input-group">
              <label>Business Address</label>
              <input
                type="text"
                name="businessAddress"
                value={formData.businessAddress}
                onChange={handleInputChange}
                maxLength={255}
                placeholder="e.g. #12 Main St., Dagupan City"
                required
              />
              {errors.businessAddress && <span className="error">{errors.businessAddress}</span>}
            </div>

            <div className="input-group">
              <label>Phone Number</label>
              <input
                type="text"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                placeholder="e.g. 09123456789 or +639123456789"
                required
              />
              {errors.phoneNumber && <span className="error">{errors.phoneNumber}</span>}
            </div>

            <button type="submit" disabled={loading}>
              {loading ? 'Sending OTP...' : 'Send OTP to Email'}
            </button>
          </form>
        ) : (
          /* STEP 2: ENTER OTP & REGISTER */
          <form onSubmit={handleVerifyAndRegister}>
            <div className="input-group">
              <label>Enter 6-Digit OTP sent to {formData.email}</label>
              <input
                type="text"
                name="otp"
                value={formData.otp}
                onChange={handleInputChange}
                maxLength={6}
                placeholder="123456"
                required
              />
              {errors.otp && <span className="error">{errors.otp}</span>}
            </div>

            <button type="submit" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify OTP & Create Account'}
            </button>
            <button type="button" onClick={() => setStep(1)} style={{ marginTop: '0.5rem' }}>
              Back to Details
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default RegisterBusinessPage;
