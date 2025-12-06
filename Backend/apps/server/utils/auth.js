import jwt from 'jsonwebtoken';

export const SECRET = process.env.JWT_SECRET || 'dev_secret_key';

export function createNewUserToken(userInfo) {
  return jwt.sign(userInfo, SECRET);
}

export function checkIfTokenIsValid(token) {
  try {
    const userData = jwt.verify(token, SECRET, { expiresIn: '2h' }
);
    return userData;
  } catch (error) {
    console.error("Authentication failed:", error.message);
    return null;
  }
}
