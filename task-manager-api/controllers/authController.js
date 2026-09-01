const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const TOKEN_EXPIRY = process.env.JWT_EXPIRES_IN || '1h';

/**
 * Signs a JWT containing the user's id. The secret comes from the environment
 * so it is never committed to the repository.
 */
const signToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in the environment');
  }

  return jwt.sign(
    { id: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
};

// Shape returned to the client - never includes the password hash
const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  createdAt: user.createdAt
});

// POST /auth/register - Create a new user with a hashed password
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const existing = await User.findOne({ email });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'An account with this email already exists'
      });
    }

    // bcrypt generates its own salt and is deliberately slow, which is what
    // makes brute-forcing a stolen hash impractical.
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({ name, email, password: hashedPassword });

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: publicUser(user),
      token: signToken(user)
    });
  } catch (err) {
    next(err);
  }
};

// POST /auth/login - Verify credentials and issue a JWT
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // password has select: false on the schema, so it must be asked for explicitly
    const user = await User.findOne({ email }).select('+password');

    // Same generic message for both cases so the response cannot be used
    // to discover which emails are registered.
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: publicUser(user),
      token: signToken(user)
    });
  } catch (err) {
    next(err);
  }
};

// GET /auth/me - Return the logged-in user, resolved from the decoded token
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.status(200).json({ success: true, data: publicUser(user) });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /auth/logout
 * A JWT is stateless, so the server cannot revoke it - logging out means the
 * client discards its stored token. This endpoint exists so the frontend has a
 * single, explicit place to trigger that.
 */
const logout = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Logged out. Discard the stored token on the client.'
  });
};

module.exports = { register, login, getMe, logout };
