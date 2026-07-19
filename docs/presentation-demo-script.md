# ForgeFleet presentation demo script

## Purpose

This script demonstrates the frontend-only Fleet Maintenance Log workflow using browser-persisted demonstration records. It does not require a backend or network connection after the frontend dependencies are installed.

## Development accounts

| Role          | Email                      | Password      |
| ------------- | -------------------------- | ------------- |
| Administrator | `admin@forgefleet.demo`    | `admin123`    |
| Manager       | `manager@forgefleet.demo`  | `manager123`  |
| Mechanic      | `mechanic@forgefleet.demo` | `mechanic123` |
| Driver        | `driver@forgefleet.demo`   | `driver123`   |

These credentials are visible frontend demonstration data. They are not secrets and do not provide production security.

## Preparation

1. From `frontend/`, run `npm run dev`.
2. Open the local URL printed by Vite.
3. Reset ForgeFleet demonstration storage using the safe reset procedure at the end of this document.
4. Use the dates shown below. If the demonstration is performed after 19 July 2026, the same date remains valid because it is historical. Never enter a future assignment or mileage-log date.

## Exact demonstration sequence

### 1. Sign in as administrator

Open **Sign in** and enter:

- Email: `admin@forgefleet.demo`
- Password: `admin123`

Expected output: the Administrator dashboard opens and displays totals calculated from the current browser records.

### 2. Create the demonstration vehicle

Open **Vehicles**, select **Add vehicle**, and enter:

- Fleet number: `DEMO-9001`
- Plate number: `DEMO 9001`
- VIN: `DEMO2026000009001`
- Make: `Forge Motors`
- Model: `Presentation Runner`
- Year: `2026`
- Vehicle type: `Service Van`
- Status: `Active`
- Current mileage: `1000`

Expected output: the vehicle is added, appears in the inventory, and creates an audit event.

### 3. Demonstrate duplicate validation

Try to add another vehicle with fleet number `DEMO-9002`, VIN `DEMO2026000009002`, and the same plate `DEMO 9001`.

Expected output: the form remains open and reports that the plate number is already in use.

Then use fleet number `DEMO-9003`, plate `DEMO 9003`, and the original VIN `DEMO2026000009001`.

Expected output: the form remains open and reports that the VIN is already in use. No duplicate vehicle is created.

### 4. Confirm the driver relationship

Open **Drivers** and locate **Carlo Reyes**.

Expected output: Carlo has one user account and one linked driver profile with employee and license details. The active session is not inferred from a fixed driver ID.

### 5. Assign the driver to the new vehicle

Sign out, then sign in as the manager account.

Carlo initially has a seeded active assignment. Open **Assignments**, end Carlo's current assignment using `2026-07-19`, then create a new assignment:

- Driver: `Carlo Reyes`
- Vehicle: `DEMO-9001`
- Start date: `2026-07-19`

Expected output: the old assignment remains in history, the new assignment is active, Carlo's status is assigned, and an assignment notification and audit event are created.

### 6. Verify the driver's current vehicle

Sign out and sign in as the driver account.

Expected output: the Driver dashboard shows `DEMO-9001`, plate `DEMO 9001`, and current mileage `1,000 km`. It must not show the previously assigned vehicle as current.

### 7. Submit a mileage log

Open **Mileage** and submit:

- Odometer reading: `1500`
- Submission date: `2026-07-19`
- Notes: `Presentation route reading.`

Expected output: a success message appears, the mileage log is added, the vehicle current mileage becomes `1,500 km`, and mileage-based service statuses recalculate. With no completed service yet, the service types clearly show `NO HISTORY` rather than an invented last-service mileage.

### 8. Demonstrate odometer validation

Try `1500` again, then try `1499`.

Expected output: both submissions are rejected inline because the new odometer reading must be greater than the current vehicle mileage and latest mileage log. The vehicle remains at `1,500 km`.

### 9. Create and assign maintenance work

Sign out and sign in as the manager. Open **Work orders** and create:

- Vehicle: `DEMO-9001`
- Service type: `Preventive Maintenance A`
- Assigned mechanic: `Noel Ramos`
- Scheduled date: `2026-07-19`
- Priority: `Medium`
- Notes: `Establish the first mileage-based service record.`

Expected output: the work order is `Assigned`, appears in the work-order table, notifies Noel, and creates creation and assignment audit events. The scheduled date is manual planning metadata only and does not determine service urgency.

### 10. Complete the mechanic workflow

Sign out and sign in as the mechanic account.

Expected output: Noel's dashboard and **My work orders** show the `DEMO-9001` work order; work assigned to another mechanic is not presented as Noel's work.

Select **Start work**.

Expected output: the order changes to `In progress`, the vehicle changes to `Maintenance`, and relevant audit and notifications are created.

Select **Complete work** and enter:

- Odometer at service: `1500`
- Total cost: `1250`
- Service notes: `Inspection completed and fluid levels verified.`

Expected output: the order becomes `Completed`, one maintenance-history record is created, the vehicle returns to `Active`, and duplicate completion is no longer available.

### 11. Verify the next-service calculation

Open **Service history** or the vehicle service breakdown.

Expected output for Preventive Maintenance A:

- Current mileage: `1,500 km`
- Last service mileage: `1,500 km`
- Recommended interval: `10,000 km`
- Next service mileage: `11,500 km`
- Remaining distance: `10,000 km`
- Status: `UPCOMING`

The calculation is `1,500 + 10,000 = 11,500 km`. No calendar date determines this status.

### 12. Verify notifications, audit events, and reports

Open **Notifications** for each relevant role.

Expected output: assignment, mechanic work, vehicle status, and completion notifications show a date, type, unread state, and valid destination. Mark-one and mark-all actions update the calculated unread count.

Sign in as administrator and open **Audit log**.

Expected output: searchable events show timestamp, actor name and ID, role, action, entity, and description for the demonstrated workflow. The page states that this is not secure server auditing.

Open **Reports**.

Expected output: `DEMO-9001`, its `1,500 km` odometer, completed maintenance, `₱1,250.00` cost, assignment, work-order status, and mileage-based service calculation are derived from the updated centralized records.

### 13. Verify role restrictions and sign out

While signed in as driver, try to open `/management/vehicles`. While signed in as mechanic, try `/admin/audit-log`.

Expected output: the Unauthorized page appears and no management mutation is available.

Use the profile menu and select **Sign out**.

Expected output: the session is removed and the sign-in page appears.

## Conflict recovery

If `DEMO-9001`, its plate, VIN, or the intended assignment already exists:

1. Confirm whether a previous presentation run is still stored in this browser.
2. If the partial run is useful, continue from the first incomplete step.
3. Otherwise, sign out and perform the scoped ForgeFleet reset below.
4. Reload the page and begin again from administrator sign-in.

Do not delete individual historical records to force the flow. Reset the complete demonstration state so linked assignments, mileage, maintenance history, notifications, and audit events remain internally consistent.

## Safe demonstration-data reset

This reset removes only ForgeFleet frontend demonstration keys from the current browser origin:

1. Sign out.
2. Open the browser developer console for the local ForgeFleet page.
3. Run:

```js
Object.keys(localStorage)
  .filter((key) => key.startsWith("forgefleet.frontend."))
  .forEach((key) => localStorage.removeItem(key));
location.reload();
```

After reload, the centralized seed records and four development accounts are available again. Do not clear unrelated site data or edit stored JSON manually.
