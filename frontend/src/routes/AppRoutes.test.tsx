import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Suspense } from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";

import { AuthProvider } from "../context/AuthContext";
import { DEVELOPMENT_ACCOUNTS } from "../data/mockAccounts";
import { authService } from "../services/authService";
import {
  FLEET_DATA_STORAGE_KEY,
  FLEET_STORAGE_KEYS,
  fleetDataService,
} from "../services/fleetDataService";
import { ROLE_NAVIGATION } from "./roleNavigation";
import { AppRoutes } from "./AppRoutes";

function renderRoutes(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <Suspense fallback={<p>Loading route</p>}>
          <AppRoutes />
        </Suspense>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("AppRoutes", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders the public landing page", async () => {
    renderRoutes("/");

    expect(
      await screen.findByRole("heading", {
        name: "Keep every vehicle mission ready.",
      }),
    ).toBeInTheDocument();
  });

  it("redirects a signed-out visitor from a protected route", async () => {
    renderRoutes("/driver/dashboard");

    expect(
      await screen.findByRole("heading", { name: "Sign in to your fleet" }),
    ).toBeInTheDocument();
  });

  it("fails closed when a restored session belongs to an inactive fleet user", async () => {
    await authService.signIn({
      email: "driver@forgefleet.demo",
      password: "driver123",
    });
    const data = structuredClone(fleetDataService.getSnapshot());
    const driver = data.users.find((user) => user.id === "demo-user-driver");
    const profile = data.driverProfiles.find(
      (item) => item.userId === "demo-user-driver",
    );
    const assignment = data.assignments.find(
      (item) => item.driverId === profile?.id && item.status === "Active",
    );
    if (!driver || !profile || !assignment) {
      throw new Error("Driver relationship fixture is missing.");
    }
    driver.status = "Inactive";
    profile.status = "Inactive";
    assignment.status = "Ended";
    assignment.endDate = "2026-07-19";
    window.localStorage.setItem(
      FLEET_DATA_STORAGE_KEY,
      JSON.stringify({ data, version: FLEET_STORAGE_KEYS.version }),
    );

    renderRoutes("/driver/dashboard");

    expect(
      await screen.findByRole("heading", { name: "Sign in to your fleet" }),
    ).toBeInTheDocument();
    expect(authService.getSession()).toBeNull();
  });

  it("creates a linked fleet profile during self-service registration", async () => {
    renderRoutes("/sign-up");

    fireEvent.change(await screen.findByLabelText(/^Full name/), {
      target: { value: "Integration Driver" },
    });
    fireEvent.change(screen.getByLabelText(/^Email address/), {
      target: { value: "integration.driver@forgefleet.demo" },
    });
    fireEvent.change(screen.getByLabelText(/^Password/), {
      target: { value: "fleet1234" },
    });
    fireEvent.change(screen.getByLabelText(/^Confirm password/), {
      target: { value: "fleet1234" },
    });
    fireEvent.change(screen.getByLabelText(/^Operational role/), {
      target: { value: "driver" },
    });
    fireEvent.change(await screen.findByLabelText(/^Driver license number/), {
      target: { value: "N09-26-445566" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(
      await screen.findByText(/your driver demonstration account is ready/i),
    ).toBeInTheDocument();
    const data = fleetDataService.getSnapshot();
    const fleetUser = data.users.find(
      (user) => user.email === "integration.driver@forgefleet.demo",
    );
    expect(fleetUser).toMatchObject({ role: "driver", status: "Active" });
    expect(
      data.driverProfiles.find((profile) => profile.userId === fleetUser?.id),
    ).toMatchObject({
      licenseNumber: "N09-26-445566",
      status: "Available",
    });
  });

  it("prevents cross-role access", async () => {
    await authService.signIn({
      email: "manager@forgefleet.demo",
      password: "manager123",
    });

    renderRoutes("/admin/dashboard");

    expect(
      await screen.findByRole("heading", {
        name: "This workspace is not available to your role.",
      }),
    ).toBeInTheDocument();
  });

  it("prevents operational roles from opening management routes", async () => {
    await authService.signIn({
      email: "mechanic@forgefleet.demo",
      password: "mechanic123",
    });

    renderRoutes("/management/vehicles");

    expect(
      await screen.findByRole("heading", {
        name: "This workspace is not available to your role.",
      }),
    ).toBeInTheDocument();
  });

  it("allows managers to manage vehicles but not user accounts", async () => {
    await authService.signIn({
      email: "manager@forgefleet.demo",
      password: "manager123",
    });

    const vehicleRoute = renderRoutes("/management/vehicles");
    expect(
      await screen.findByRole("heading", { name: "Vehicle management" }),
    ).toBeInTheDocument();
    vehicleRoute.unmount();

    renderRoutes("/management/users");
    expect(
      await screen.findByRole("heading", {
        name: "This workspace is not available to your role.",
      }),
    ).toBeInTheDocument();
  });

  it("protects the frontend demonstration audit log for administrators", async () => {
    await authService.signIn({
      email: "admin@forgefleet.demo",
      password: "admin123",
    });
    const adminRoute = renderRoutes("/admin/audit-log");
    expect(
      await screen.findByRole("heading", { name: "Audit log", level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText(/not secure server auditing/i)).toBeInTheDocument();
    adminRoute.unmount();

    authService.signOut();
    await authService.signIn({
      email: "manager@forgefleet.demo",
      password: "manager123",
    });
    renderRoutes("/admin/audit-log");
    expect(
      await screen.findByRole("heading", {
        name: "This workspace is not available to your role.",
      }),
    ).toBeInTheDocument();
  });

  it("enforces operational routes for managers, mechanics, and drivers", async () => {
    await authService.signIn({
      email: "mechanic@forgefleet.demo",
      password: "mechanic123",
    });
    const mechanicWork = renderRoutes("/maintenance/work-orders");
    expect(
      await screen.findByRole("heading", { name: "My maintenance work" }),
    ).toBeInTheDocument();
    mechanicWork.unmount();

    const mechanicSchedule = renderRoutes("/maintenance/schedules");
    expect(
      await screen.findByRole("heading", {
        name: "This workspace is not available to your role.",
      }),
    ).toBeInTheDocument();
    mechanicSchedule.unmount();

    authService.signOut();
    await authService.signIn({
      email: "driver@forgefleet.demo",
      password: "driver123",
    });
    const driverMaintenance = renderRoutes("/driver/maintenance");
    expect(
      await screen.findByRole("heading", { name: "Vehicle maintenance" }),
    ).toBeInTheDocument();
    driverMaintenance.unmount();

    renderRoutes("/maintenance/work-orders");
    expect(
      await screen.findByRole("heading", {
        name: "This workspace is not available to your role.",
      }),
    ).toBeInTheDocument();
  });

  it("allows driver mileage and shared account pages while protecting reports", async () => {
    await authService.signIn({
      email: "driver@forgefleet.demo",
      password: "driver123",
    });

    const mileageRoute = renderRoutes("/driver/mileage");
    expect(
      await screen.findByRole("heading", { name: "Driver mileage" }),
    ).toBeInTheDocument();
    mileageRoute.unmount();

    const notificationRoute = renderRoutes("/notifications");
    expect(
      await screen.findByRole("heading", { name: "Notifications", level: 1 }),
    ).toBeInTheDocument();
    notificationRoute.unmount();

    const profileRoute = renderRoutes("/profile");
    expect(
      await screen.findByRole("heading", { name: "Profile", level: 1 }),
    ).toBeInTheDocument();
    profileRoute.unmount();

    renderRoutes("/reports");
    expect(
      await screen.findByRole("heading", {
        name: "This workspace is not available to your role.",
      }),
    ).toBeInTheDocument();
  });

  it("allows managers to open data-derived reports but not driver mileage", async () => {
    await authService.signIn({
      email: "manager@forgefleet.demo",
      password: "manager123",
    });

    const reportsRoute = renderRoutes("/reports");
    expect(
      await screen.findByRole("heading", { name: "Fleet reports" }),
    ).toBeInTheDocument();
    reportsRoute.unmount();

    renderRoutes("/driver/mileage");
    expect(
      await screen.findByRole("heading", {
        name: "This workspace is not available to your role.",
      }),
    ).toBeInTheDocument();
  });

  it.each([
    [
      "admin@forgefleet.demo",
      "admin123",
      "/admin/dashboard",
      "Administrator dashboard",
    ],
    [
      "manager@forgefleet.demo",
      "manager123",
      "/manager/dashboard",
      "Manager dashboard",
    ],
    [
      "mechanic@forgefleet.demo",
      "mechanic123",
      "/mechanic/dashboard",
      "Mechanic dashboard",
    ],
    [
      "driver@forgefleet.demo",
      "driver123",
      "/driver/dashboard",
      "Driver dashboard",
    ],
  ])(
    "renders the dashboard associated with %s",
    async (email, password, path, heading) => {
      await authService.signIn({ email, password });

      renderRoutes(path);

      expect(
        await screen.findByRole("heading", { name: heading, level: 1 }),
      ).toBeInTheDocument();
    },
  );

  it.each(DEVELOPMENT_ACCOUNTS)(
    "resolves every $role navigation destination",
    async (account) => {
      await authService.signIn({
        email: account.email,
        password: account.password,
      });

      for (const navigationItem of ROLE_NAVIGATION[account.role]) {
        const route = renderRoutes(navigationItem.to);
        await waitFor(() =>
          expect(screen.queryByText("Loading route")).not.toBeInTheDocument(),
        );
        expect(
          screen.getByRole("link", { name: navigationItem.label }),
        ).toBeInTheDocument();
        expect(
          screen.queryByRole("heading", { name: "Page not found" }),
        ).not.toBeInTheDocument();
        expect(
          screen.queryByRole("heading", {
            name: "This workspace is not available to your role.",
          }),
        ).not.toBeInTheDocument();
        route.unmount();
      }
    },
  );

  it("signs out from an authenticated dashboard", async () => {
    await authService.signIn({
      email: "driver@forgefleet.demo",
      password: "driver123",
    });

    renderRoutes("/driver/dashboard");
    fireEvent.click(
      await screen.findByRole("button", { name: "Open profile menu" }),
    );
    fireEvent.click(await screen.findByRole("button", { name: "Sign out" }));

    expect(
      await screen.findByRole("heading", { name: "Sign in to your fleet" }),
    ).toBeInTheDocument();
    expect(fleetDataService.getSnapshot().auditEvents).toContainEqual(
      expect.objectContaining({
        action: "Signed out",
        userId: "demo-user-driver",
        userDisplayName: "Carlo Reyes",
      }),
    );
  });

  it("records successful sign in through the authentication context", async () => {
    renderRoutes("/sign-in");
    fireEvent.change(await screen.findByLabelText(/^Email address/), {
      target: { value: "manager@forgefleet.demo" },
    });
    fireEvent.change(screen.getByLabelText(/^Password/), {
      target: { value: "manager123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(
      await screen.findByRole("heading", { name: "Manager dashboard" }),
    ).toBeInTheDocument();
    expect(fleetDataService.getSnapshot().auditEvents).toContainEqual(
      expect.objectContaining({
        action: "Signed in",
        role: "manager",
        userId: "demo-user-manager",
        userDisplayName: "Maria Santos",
      }),
    );
  });

  it("renders the not-found page for unknown routes", async () => {
    renderRoutes("/missing-route");

    expect(
      await screen.findByRole("heading", { name: "Page not found" }),
    ).toBeInTheDocument();
  });
});
