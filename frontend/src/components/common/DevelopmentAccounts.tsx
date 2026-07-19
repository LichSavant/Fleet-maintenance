import { DEVELOPMENT_ACCOUNTS } from "../../data/mockAccounts";
import { formatRole } from "../../utils/roleRoutes";

export function DevelopmentAccounts() {
  return (
    <details className="development-accounts">
      <summary>Development accounts</summary>
      <div className="development-account-list">
        {DEVELOPMENT_ACCOUNTS.map((account) => (
          <div key={account.id}>
            <strong>{formatRole(account.role)}</strong>
            <code>{account.email}</code>
            <code>{account.password}</code>
          </div>
        ))}
      </div>
      <p>Browser-visible demonstration credentials; not actual secrets.</p>
    </details>
  );
}
