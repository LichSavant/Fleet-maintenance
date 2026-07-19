import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { DashboardLayout } from "./DashboardLayout";

const navigation = [
  { icon: "dashboard" as const, label: "Dashboard", to: "/dashboard" },
  { icon: "truck" as const, label: "Vehicles", to: "/vehicles" },
];

describe("DashboardLayout mobile navigation", () => {
  it("moves focus into the drawer, traps Tab, closes with Escape, and restores focus", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route element={<DashboardLayout navigation={navigation} />} path="/">
            <Route index element={<p>Dashboard content</p>} />
            <Route path="dashboard" element={<p>Dashboard content</p>} />
            <Route path="vehicles" element={<p>Vehicle content</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    const opener = screen.getByRole("button", { name: "Open navigation" });
    opener.focus();
    fireEvent.click(opener);

    const drawer = screen.getByRole("dialog", { name: "Primary navigation" });
    expect(drawer).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Close sidebar navigation" }),
    ).toBeInTheDocument();
    expect(
      within(drawer).getByRole("link", { name: "ForgeFleet home" }),
    ).toHaveFocus();

    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(screen.getByRole("link", { name: "Vehicles" })).toHaveFocus();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });
});
