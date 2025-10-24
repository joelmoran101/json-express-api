# CSRF Protection - Quick Reference

## 🚀 Quick Start

### For Frontend Developers

```javascript
// 1. Read CSRF token from cookie
const csrfToken = document.cookie
  .split('; ')
  .find(row => row.startsWith('XSRF-TOKEN='))
  ?.split('=')[1];

// 2. Include in POST/PUT/DELETE requests
fetch('http://localhost:3001/api/charts', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken  // ← Add this!
  },
  credentials: 'include',  // ← And this!
  body: JSON.stringify({ plotlyData: {...} })
});
```

---

## 📋 Checklist for Every State-Changing Request

- [ ] Cookie name: `XSRF-TOKEN`
- [ ] Header name: `X-CSRF-Token`
- [ ] Include `credentials: 'include'` in fetch
- [ ] Use for: POST, PUT, DELETE, PATCH
- [ ] Skip for: GET, HEAD, OPTIONS

---

## 🧪 Test Commands

```bash
# Get token
curl -c cookies.txt http://localhost:3001/api/csrf-token

# Extract token
TOKEN=$(grep XSRF-TOKEN cookies.txt | awk '{print $7}')

# Use token
curl -X POST http://localhost:3001/api/charts \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $TOKEN" \
  -b cookies.txt \
  -d '{"plotlyData":{"data":[],"layout":{}}}'
```

---

## 🐛 Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `403 Invalid CSRF token` | Missing header | Add `X-CSRF-Token` header |
| `403 Invalid CSRF token` | Token mismatch | Read from cookie, don't hardcode |
| `403 Invalid CSRF token` | No cookies sent | Add `credentials: 'include'` |
| `403 Invalid CSRF token` | Expired token | Request new token |

---

## 🔗 Related Files

- Implementation: `/middleware/csrf.js`
- Full Documentation: `/docs/CSRF_PROTECTION.md`
- App Integration: `/app.js` (lines 96-106)

---

## 📞 Need Help?

1. Check full docs: `docs/CSRF_PROTECTION.md`
2. Test with curl commands above
3. Check browser console for cookie value
4. Verify `credentials: 'include'` is set