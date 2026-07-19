import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";

import { AuthProvider } from "../../context/AuthContext";
import { authService } from "../../services/authService";
import UsersPage from "./UsersPage";

describe("UsersPage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("searches and filters the centralized user records", async () => {
    await authService.signIn({
      email: "admin@forgefleet.demo",
      password: "admin123",
    });
    render(
      <MemoryRouter>
        <AuthProvider>
          <UsersPage />
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Liza Mendoza")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("searchbox", { name: "Search users" }), {
      target: { value: "Liza" },
    });

    expect(screen.getByText("Liza Mendoza")).toBeInTheDocument();
    expect(screen.queryByText("Felix Dela Cruz")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Role"), {
      target: { value: "mechanic" },
    });
    expect(screen.getByText("No matching users")).toBeInTheDocument();
    expect(screen.getByText("Search: “Liza”")).toBeInTheDocument();
    expect(screen.getByText("Role: mechanic")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Clear all search and filters",
      }),
    );

    expect(screen.getByText("Liza Mendoza")).toBeInTheDocument();
    expect(screen.getByText("Felix Dela Cruz")).toBeInTheDocument();
    expect(screen.getByText("No active filters")).toBeInTheDocument();
  });
});
