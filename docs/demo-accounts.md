# ForgeFleet demonstration accounts

These values exist only in the pure frontend prototype. They are stored in browser-readable JavaScript/localStorage and provide no real security.

| Role     | Email                      | Password      |
| -------- | -------------------------- | ------------- |
| Admin    | `admin@forgefleet.demo`    | `admin123`    |
| Manager  | `manager@forgefleet.demo`  | `manager123`  |
| Mechanic | `mechanic@forgefleet.demo` | `mechanic123` |
| Driver   | `driver@forgefleet.demo`   | `driver123`   |

Registration codes:

- Manager demonstration approval code: `MANAGER2026`
- Admin demonstration registration code: `ADMIN2026`

Registered accounts are added to `forgefleet_demo_v1` in localStorage. The registration codes are validated but not saved in the user record. A production backend must replace all local credentials with password hashing, approval records, rate limiting, and server authorization.
