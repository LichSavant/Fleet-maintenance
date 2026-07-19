import { beforeEach, describe, expect, it } from "vitest";

import { AUTH_STORAGE_KEYS, authService } from "./authService";

describe("authService", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("signs in a development account and restores its session", async () => {
    const session = await authService.signIn({
      email: "mechanic@forgefleet.demo",
      password: "mechanic123",
      rememberEmail: true,
    });

    expect(session.user.role).toBe("mechanic");
    expect(authService.getSession()).toEqual(session);
    expect(authService.getRememberedEmail()).toBe("mechanic@forgefleet.demo");
  });

  it("rejects invalid credentials", async () => {
    await expect(
      authService.signIn({
        email: "driver@forgefleet.demo",
        password: "incorrect",
      }),
    ).rejects.toMatchObject({ code: "invalid_credentials" });
  });

  it("registers a self-service role that can subsequently sign in", async () => {
    const user = await authService.register({
      confirmPassword: "fleet1234",
      email: "new.driver@example.com",
      fullName: "New Driver",
      password: "fleet1234",
      role: "driver",
    });

    const session = await authService.signIn({
      email: "new.driver@example.com",
      password: "fleet1234",
    });

    expect(session.user).toEqual(user);
  });

  it("keeps privileged registration policy inside the service", async () => {
    await expect(
      authService.register({
        confirmPassword: "fleet1234",
        email: "new.admin@example.com",
        fullName: "New Administrator",
        password: "fleet1234",
        role: "admin",
      }),
    ).rejects.toMatchObject({ code: "registration_restricted" });
  });

  it("fails closed and removes a malformed stored session", () => {
    window.localStorage.setItem(AUTH_STORAGE_KEYS.session, "{malformed");

    expect(authService.getSession()).toBeNull();
    expect(window.localStorage.getItem(AUTH_STORAGE_KEYS.session)).toBeNull();
  });
});
