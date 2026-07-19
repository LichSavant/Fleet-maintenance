import type { IconName } from "../components/ui/Icon";

export interface NavigationItem {
  icon: IconName;
  label: string;
  to: string;
}
