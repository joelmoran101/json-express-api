# CSRF Protection Implementation

This document explains the Cross-Site Request Forgery (CSRF) protection implementation in the Plotly Chart Storage API.

## 📋 Table of Contents

- [Overview](#overview)
- [How It Works](#how-it-works)
- [Implementation Details](#implementation-details)
- [API Endpoints](#api-endpoints)
- [Client Usage](#client-usage)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

---

## 🛡️ Overview

This API implements **Double-Submit Cookie Pattern** for CSRF protection, as recommended by OWASP:
https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#double-submit-cookie

### What is CSRF?

Cross-Site Request Forgery (CSRF) is an attack that forces authenticated users to submit unwanted requests. Without CSRF protection, a malicious website could make requests to your API using the victim's credentials.

### Why Double-Submit Cookie?

- ✅ **Stateless**: No server-side session storage needed
- ✅ **Scalable**: Works in distributed environments
- ✅ **Simple**: Easy to implement and understand
- ✅ **Effective**: Provides strong CSRF protection when combined with SameSite cookies

---

## 🔄 How It Works

### The Flow

```
1. Client requests CSRF token
   ↓
2. Server generates random token
   ↓
3. Server sets XSRF-TOKEN cookie (httpOnly: false)
   ↓
4. Client reads token from cookie
   ↓
5. Client includes token in X-CSRF-Token header for state-changing requests
   ↓
6. Server validates: cookie token === header token
   ↓
7. Request proceeds (if valid) or rejected (if invalid)
```

### Security Principle

An attacker's malicious site can cause the browser to send cookies, but **cannot read** the cookie value due to Same-Origin Policy. Therefore, the attacker cannot include the correct token in the request header.

---

## 🔧 Implementation Details

### Middleware Location

```
/middleware/csrf.js
```

### Key Components

#### 1. **validateCSRF** Middleware
```javascript
// Validates CSRF tokens on state-changing requests
// Applied to: POST, PUT, PATCH, DELETE requests to /api/*
// Skips: GET, HEAD, OPTIONS requests
```

#### 2. **autoGenerateCSRF** Middleware
```javascript
// Automatically generates CSRF token on first GET request
// Runs on all routes
// Sets XSRF-TOKEN cookie if not present
```

#### 3. **csrfTokenHandler** Endpoint
```javascript
// Dedicated endpoint for requesting fresh CSRF tokens
// Route: GET /api/csrf-token
// Returns: Token in both cookie and response body
```

### Cookie Configuration

```javascript
{
  httpOnly: false,    // Must be readable by JavaScript
  secure: true,       // HTTPS only in production
  sameSite: 'lax',   // Additional CSRF protection
  maxAge: 86400000,  // 24 hours
  path: '/'          // Available site-wide
}
```

### Protected Routes

All API routes under `/api` with state-changing methods:
- ✅ `POST /api/charts`
- ✅ `PUT /api/charts/:id`
- ✅ `DELETE /api/charts/:id`
- ✅ `POST /api/auth/login`
- ✅ `POST /api/auth/logout`
- ❌ `GET /api/charts` (not protected - safe method)
- ❌ `GET /api/csrf-token` (exempt - needed to get token)

---

## 🌐 API Endpoints

### Get CSRF Token

**Request:**
```http
GET /api/csrf-token HTTP/1.1
Host: localhost:3001
```

**Response:**
```json
{
  "success": true,
  "message": "CSRF token generated successfully",
  "data": {
    "token": "a1b2c3d4e5f6...64-char-hex",
    "expiresIn": "24h"
  },
  "meta": {
    "timestamp": "2025-10-24T10:30:00.000Z"
  }
}
```

**Cookie Set:**
```
Set-Cookie: XSRF-TOKEN=a1b2c3d4e5f6...64-char-hex; Path=/; SameSite=Lax; Max-Age=86400000
```

---

## 💻 Client Usage

### Option 1: Automatic Token (Recommended)

The server automatically generates a CSRF token on your first GET request:

```javascript
// 1. Make any GET request to the API
const response = await fetch('http://localhost:3001/api/charts');

// 2. CSRF token is now in cookies (XSRF-TOKEN)
// 3. Read token from cookie
const csrfToken = document.cookie
  .split('; ')
  .find(row => row.startsWith('XSRF-TOKEN='))
  ?.split('=')[1];

// 4. Include in subsequent state-changing requests
await fetch('http://localhost:3001/api/charts', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken  // ← Required!
  },
  credentials: 'include',  // Important: send cookies
  body: JSON.stringify({ plotlyData: {...} })
});
```

### Option 2: Explicit Token Request

Request a fresh token explicitly:

```javascript
// 1. Request CSRF token
const tokenResponse = await fetch('http://localhost:3001/api/csrf-token', {
  credentials: 'include'
});
const { data } = await tokenResponse.json();
const csrfToken = data.token;

// 2. Use token in requests
await fetch('http://localhost:3001/api/charts', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken
  },
  credentials: 'include',
  body: JSON.stringify({ plotlyData: {...} })
});
```

### React Example with Axios

```javascript
import axios from 'axios';

// Configure axios instance
const api = axios.create({
  baseURL: 'http://localhost:3001',
  withCredentials: true  // Send cookies
});

// Axios interceptor to automatically include CSRF token
api.interceptors.request.use(
  (config) => {
    // Skip for GET, HEAD, OPTIONS
    if (!['get', 'head', 'options'].includes(config.method)) {
      const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('XSRF-TOKEN='))
        ?.split('=')[1];
      
      if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Now all requests automatically include CSRF token
await api.post('/api/charts', { plotlyData: {...} });
```

### React Hook for CSRF

```javascript
import { useEffect, useState } from 'react';

export const useCSRFToken = () => {
  const [token, setToken] = useState(null);

  useEffect(() => {
    const getToken = () => {
      const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('XSRF-TOKEN='))
        ?.split('=')[1];
      setToken(csrfToken);
    };

    // Get initial token
    getToken();

    // Re-check token periodically
    const interval = setInterval(getToken, 60000); // Every minute
    return () => clearInterval(interval);
  }, []);

  return token;
};

// Usage
function MyComponent() {
  const csrfToken = useCSRFToken();

  const uploadChart = async (data) => {
    if (!csrfToken) {
      console.error('No CSRF token available');
      return;
    }

    await fetch('http://localhost:3001/api/charts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken
      },
      credentials: 'include',
      body: JSON.stringify(data)
    });
  };

  return <button onClick={uploadChart}>Upload</button>;
}
```

---

## 🧪 Testing

### Test CSRF Protection Works

#### 1. Get CSRF Token
```bash
curl -c cookies.txt http://localhost:3001/api/csrf-token
```

#### 2. Extract Token from Cookie File
```bash
grep XSRF-TOKEN cookies.txt | awk '{print $7}'
```

#### 3. Try Request WITHOUT Token (Should Fail)
```bash
curl -X POST http://localhost:3001/api/charts \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"plotlyData":{"data":[],"layout":{}}}'

# Expected: 403 Forbidden - "Invalid CSRF token"
```

#### 4. Try Request WITH Token (Should Succeed)
```bash
TOKEN=$(grep XSRF-TOKEN cookies.txt | awk '{print $7}')

curl -X POST http://localhost:3001/api/charts \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $TOKEN" \
  -b cookies.txt \
  -d '{"plotlyData":{"data":[],"layout":{}}}'

# Expected: 201 Created - Chart saved successfully
```

### Test Auto-Generation

```bash
# First request - token should be auto-generated
curl -i -c cookies.txt http://localhost:3001/api/charts

# Check Set-Cookie header for XSRF-TOKEN
```

---

## 🔍 Troubleshooting

### Error: "Invalid CSRF token"

**Symptoms:**
```json
{
  "success": false,
  "error": "Invalid CSRF token",
  "message": "CSRF token validation failed. Please refresh and try again.",
  "code": "CSRF_VALIDATION_FAILED"
}
```

**Common Causes:**

1. **No CSRF token in header**
   - Solution: Include `X-CSRF-Token` header in POST/PUT/DELETE requests

2. **Token mismatch**
   - Cookie token doesn't match header token
   - Solution: Read token directly from cookie, don't hardcode

3. **Missing credentials**
   - Cookies not being sent
   - Solution: Set `credentials: 'include'` in fetch or `withCredentials: true` in axios

4. **Token expired**
   - Token older than 24 hours
   - Solution: Request fresh token from `/api/csrf-token`

5. **Wrong header name**
   - Using `X-XSRF-Token` instead of `X-CSRF-Token`
   - Solution: Use exact header name: `X-CSRF-Token`

### Debugging Checklist

```javascript
// 1. Check if cookie exists
console.log('Cookies:', document.cookie);

// 2. Extract CSRF token
const token = document.cookie
  .split('; ')
  .find(row => row.startsWith('XSRF-TOKEN='))
  ?.split('=')[1];
console.log('CSRF Token:', token);

// 3. Verify request headers
console.log('Request headers:', {
  'X-CSRF-Token': token,
  'Content-Type': 'application/json'
});

// 4. Check credentials setting
console.log('Credentials:', 'include');
```

---

## 🔒 Security Considerations

### What CSRF Protection Does

✅ **Protects against:**
- Cross-site request forgery attacks
- Unauthorized state-changing requests
- Malicious websites making requests on behalf of users

### What CSRF Protection Does NOT Do

❌ **Does NOT protect against:**
- XSS (Cross-Site Scripting) attacks
- Man-in-the-middle attacks (use HTTPS!)
- Replay attacks (implement with authentication tokens)
- DDoS attacks (use rate limiting)

### Additional Security Layers

This API also implements:
- ✅ **SameSite cookies** (`lax`) - Additional CSRF protection
- ✅ **CORS** - Restricts cross-origin requests
- ✅ **Rate limiting** - Prevents brute force attacks
- ✅ **Input validation** - Prevents injection attacks
- ✅ **Security headers** - Helmet.js for HTTP headers

---

## 📚 References

- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [Double-Submit Cookie Pattern](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#double-submit-cookie)
- [SameSite Cookie Attribute](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite)

---

## 📝 Summary

### For Backend Developers

- CSRF middleware is in `/middleware/csrf.js`
- Applied automatically to all `/api/*` state-changing routes
- Tokens auto-generated on first GET request
- 24-hour token expiration

### For Frontend Developers

- Read CSRF token from `XSRF-TOKEN` cookie
- Include token in `X-CSRF-Token` header for POST/PUT/DELETE
- Set `credentials: 'include'` in fetch requests
- Token refreshes automatically with new GET requests

### Quick Start

```javascript
// Frontend: Include token in every state-changing request
const token = document.cookie.split('XSRF-TOKEN=')[1]?.split(';')[0];

fetch('/api/charts', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': token
  },
  credentials: 'include',
  body: JSON.stringify(data)
});
```

---

*Last updated: October 24, 2025*  
*Version: 1.0.0*