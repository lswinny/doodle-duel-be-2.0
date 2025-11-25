// auth.js
const jwt = require('jsonwebtoken');

// Secret key used to sign and check tokens.
// Keep this in your .env file for security.
const SECRET = process.env.JWT_SECRET || 'dev_secret_key';

// Check if a token is valid and return the user info inside it
function checkIfTokenIsValid(token) {
  try {
    const userData = jwt.verify(token, SECRET);
    return userData; // e.g. { userId: "123", username: "me" }
  } catch (error) {
    console.error("Authentication failed:", error.message);
    return null; // means invalid or expired token
  }
}

// Create a new token for a user (usually after login/signup)
function createNewUserToken(userInfo) {
  return jwt.sign(userInfo, SECRET);
}

module.exports = {
  checkIfTokenIsValid,
  createNewUserToken
};
