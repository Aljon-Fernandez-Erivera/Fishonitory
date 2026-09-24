const test = require('node:test');
const assert = require('node:assert/strict');

const payrollController = require('../controllers/payrollController');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Payroll = require('../models/Payroll');

test('savePayroll forwards unexpected errors to Express next()', async () => {
  const originalUserFindOne = User.findOne;
  const originalAttendanceFind = Attendance.find;
  const originalPayrollFindOneAndUpdate = Payroll.findOneAndUpdate;

  User.findOne = async () => ({
    _id: 'staff-123',
    staffName: 'Jane Staff',
    ownerId: 'owner-123',
    role: 'Staff',
  });
  Attendance.find = async () => [];
  Payroll.findOneAndUpdate = () => ({
    populate: async () => {
      throw new Error('DB exploded');
    },
  });

  try {
    let capturedError = null;
    const req = {
      user: { userId: 'owner-123', role: 'Owner' },
      body: {
        staffId: 'staff-123',
        periodType: 'monthly',
        periodStart: '2026-09-01',
        periodEnd: '2026-09-30',
        dailyRate: 500,
        benefitItems: [{ name: 'Bonus', amount: 100, type: 'addition' }],
        notes: 'Good month',
      },
    };
    const res = {
      status: () => ({ json: () => undefined }),
    };

    await payrollController.savePayroll(req, res, (error) => {
      capturedError = error;
    });

    assert.ok(capturedError, 'expected savePayroll to call Express next(error)');
    assert.equal(capturedError.message, 'DB exploded');
  } finally {
    User.findOne = originalUserFindOne;
    Attendance.find = originalAttendanceFind;
    Payroll.findOneAndUpdate = originalPayrollFindOneAndUpdate;
  }
});
