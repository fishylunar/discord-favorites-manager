import * as CryptoJS from 'crypto-js';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';

const TOKEN_FILE_PATH = path.join(os.homedir(), '.discord-favorites-manager', 'token.dat');

/**
 * Generate encryption key from machine hostname and username
 */
function getEncryptionKey(): string {
  const hostname = os.hostname();
  const username = os.userInfo().username;
  return CryptoJS.SHA256(`${hostname}-${username}-discord-favorites`).toString();
}

/**
 * Encrypt and save token to disk
 */
export function saveToken(token: string): void {
  try {
    const key = getEncryptionKey();
    const encrypted = CryptoJS.AES.encrypt(token, key).toString();
    
    // Ensure directory exists
    const dir = path.dirname(TOKEN_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(TOKEN_FILE_PATH, encrypted, 'utf8');
  } catch (error) {
    console.error('Failed to save token:', error);
    throw new Error('Failed to save token');
  }
}

/**
 * Load and decrypt token from disk
 */
export function loadToken(): string | null {
  try {
    if (!fs.existsSync(TOKEN_FILE_PATH)) {
      return null;
    }
    
    const encrypted = fs.readFileSync(TOKEN_FILE_PATH, 'utf8');
    const key = getEncryptionKey();
    const decrypted = CryptoJS.AES.decrypt(encrypted, key);
    const token = decrypted.toString(CryptoJS.enc.Utf8);
    
    // Validate token format (basic check)
    if (!token || token.length < 50) {
      return null;
    }
    
    return token;
  } catch (error) {
    console.error('Failed to load token:', error);
    return null;
  }
}

/**
 * Delete saved token
 */
export function deleteToken(): void {
  try {
    if (fs.existsSync(TOKEN_FILE_PATH)) {
      fs.unlinkSync(TOKEN_FILE_PATH);
    }
  } catch (error) {
    console.error('Failed to delete token:', error);
  }
}
