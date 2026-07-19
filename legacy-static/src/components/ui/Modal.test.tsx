import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { Button } from "./Button";
import { Modal } from "./Modal";

function ModalHarness() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Open preview</Button>
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Keyboard dialog"
      >
        <p>Dialog content</p>
      </Modal>
    </>
  );
}

describe("Modal", () => {
  it("closes with Escape and restores focus to the opener", () => {
    render(<ModalHarness />);
    const opener = screen.getByRole("button", { name: "Open preview" });

    opener.focus();
    fireEvent.click(opener);
    expect(
      screen.getByRole("dialog", { name: "Keyboard dialog" }),
    ).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });
});
