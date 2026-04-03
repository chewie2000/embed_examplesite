import { SignJWT, jwtVerify } from 'jose';

const getSecret = () => new TextEncoder().encode(process.env.SESSION_SECRET);

/**
 * Creates a signed session JWT for the authenticated user.
 * Stored as an httpOnly cookie — never exposed to the browser.
 *
 * @param {{ email: string, name: string, accountType: string, teams: string[] }} user
 * @returns {Promise<string>} signed JWT
 */
export async function createSession(user) {
  return new SignJWT({
    email: user.email,
    name: user.name,
    accountType: user.accountType,
    teams: user.teams,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(getSecret());
}

/**
 * Verifies and decodes a session JWT.
 * Throws if the token is invalid or expired.
 *
 * @param {string} token
 * @returns {Promise<object>} decoded session payload
 */
export async function verifySession(token) {
  const { payload } = await jwtVerify(token, getSecret());
  return payload;
}
