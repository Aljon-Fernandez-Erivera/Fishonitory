import { useEffect, useState } from 'react';
import { getCountries, getCountryCallingCode } from 'libphonenumber-js';

const countryNameFormatter = new Intl.DisplayNames(['en'], { type: 'region' });
const countryOptions = getCountries()
  .map((country) => ({
    country,
    name: countryNameFormatter.of(country) || country,
    callingCode: getCountryCallingCode(country)
  }))
  .sort((first, second) => first.name.localeCompare(second.name));

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
  const [dialogMessage, setDialogMessage] = useState('');
  const [otpSeconds, setOtpSeconds] = useState(0);
  const [countryIso, setCountryIso] = useState('PH');

  useEffect(() => {
    if (step !== 2 || otpSeconds <= 0) return undefined;
// Start the countdown timer for OTP expiration once napindot ang continue
    const timer = setTimeout(() => {
      setOtpSeconds((seconds) => Math.max(seconds - 1, 0));
    }, 1000);

    return () => clearTimeout(timer);
  }, [step, otpSeconds]);

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
        sanitizedValue = value.replace(/\D/g, '');
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
    const fullPhoneNumber = `${getCountryCallingCode(countryIso)}${formData.phoneNumber}`;

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
    if (!/^\d{4,14}$/.test(formData.phoneNumber) || fullPhoneNumber.length > 15) {
      newErrors.phoneNumber = 'Enter a valid phone number using digits only.';
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
        body: JSON.stringify({
          ...formData,
          phoneNumber: `${getCountryCallingCode(countryIso)}${formData.phoneNumber}`
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send OTP.');
      }

      setOtpSeconds(0);
      setDialogMessage(data.message);
    } catch (err) {
      setServerMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const closeOtpDialog = () => {
    setDialogMessage('');
    setOtpSeconds(5 * 60); 
    setStep(2);
  };

  // Verify OTP & Create Account
  const handleVerifyAndRegister = async (e) => {
    e.preventDefault();
    setServerMessage('');

    if (otpSeconds === 0) {
      setErrors({ otp: 'The OTP has expired. Please request a new OTP.' });
      return;
    }

    if (formData.otp.length !== 6) {
      setErrors({ otp: 'Please enter a valid 6-digit OTP code.' });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('http://localhost:3000/api/auth/verify-and-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          phoneNumber: `${getCountryCallingCode(countryIso)}${formData.phoneNumber}`
        })
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

        {/* OTP Dialog */}
        <dialog open={Boolean(dialogMessage)} aria-labelledby="otp-dialog-title">
          <h2 id="otp-dialog-title">OTP Sent</h2>
          <p>{dialogMessage}</p>
          <button type="button" onClick={closeOtpDialog}>
            Continue
          </button>
        </dialog>
        
        {serverMessage && <p className="alert">{serverMessage}</p>}

        {step === 1 ? (
          /* FILL DETAILS & SEND OTP */
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
                placeholder="e.g. 123 Aqua St., Fishville, PH"
                required
              />
              {errors.businessAddress && <span className="error">{errors.businessAddress}</span>}
            </div>

            <div className="input-group">
              <label>Phone Number</label>
              <div>
                <select
                  value={countryIso}
                  onChange={(e) => setCountryIso(e.target.value)}
                  aria-label="Country code"
                >
                  {countryOptions.map(({ country, name, callingCode }) => (
                    <option key={country} value={country}>
                      {name} (+{callingCode})
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={14}
                  placeholder="Phone number"
                  required
                />
              </div>
              {errors.phoneNumber && <span className="error">{errors.phoneNumber}</span>}
            </div>

            <button type="submit" disabled={loading}>
              {loading ? 'Sending OTP...' : 'Get OTP'}
            </button>
          </form>
        ) : (
          /* ENTER OTP & REGISTER */
          <form onSubmit={handleVerifyAndRegister}>
            <div className="input-group">
              <label>Enter 6-Digit OTP sent to {formData.email}</label>
              <p>
                OTP expires in {String(Math.floor(otpSeconds / 60)).padStart(2, '0')}:
                {String(otpSeconds % 60).padStart(2, '0')}
              </p>
              <input
                type="number"
                name="otp"
                value={formData.otp}
                onChange={handleInputChange}
                maxLength={6}
                placeholder="123456"
                required
              />
              {errors.otp && <span className="error">{errors.otp}</span>}
            </div>

            <button type="submit" disabled={loading || otpSeconds === 0}>
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
