export interface MobileNavigationProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileNavigation({ isOpen, onClose }: MobileNavigationProps) {
  if (!isOpen) return null;

  return (
    <button
      aria-label="Dismiss navigation overlay"
      className="navigation-scrim"
      onClick={onClose}
      type="button"
    />
  );
}
