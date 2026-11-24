import { describe, expect, it } from "vitest";
import {
  registerWorkspaceAccountViaBff,
  loginWithCredentialsViaBff,
  resetPasswordViaBff,
  resetLocalAuthStateForTesting,
  getLocalAuthState,
} from "@/lib/auth-bff";

describe("Auth State Disk Persistence & Password Reset", () => {
  it("persists registered user across simulated server restarts and permits login", () => {
    const testEmail = `persistent-${Date.now()}@testcorp.ng`;
    const testPassword = "SuperSecret#2026";

    // 1. Register a new user
    const regResult = registerWorkspaceAccountViaBff(
      JSON.stringify({
        fullName: "Tunde Ojo",
        email: testEmail,
        password: testPassword,
        workspaceName: "Ojo Logistics Ltd",
        rcNumber: "RC 888222",
      }),
    );
    expect(regResult.status).toBe(201);

    // 2. Simulate server restart: clear memory global ref and re-fetch state
    resetLocalAuthStateForTesting();

    // 3. Verify user is retained from disk in fresh state
    const stateAfterRestart = getLocalAuthState();
    const userFound = stateAfterRestart.users.find(
      (u) => u.email.toLowerCase() === testEmail.toLowerCase(),
    );
    expect(userFound).toBeDefined();
    expect(userFound?.fullName).toBe("Tunde Ojo");

    // 4. Verify login succeeds with the persisted credentials
    const loginResult = loginWithCredentialsViaBff(
      JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    );
    expect(loginResult.status).toBe(200);
    if ("authenticated" in loginResult.body) {
      expect(loginResult.body.authenticated).toBe(true);
      expect(loginResult.body.user?.email).toBe(testEmail);
      expect(loginResult.body.workspace?.legalName).toBe("Ojo Logistics Ltd");
    }
  });

  it("resets password via resetPasswordViaBff and allows login with new password", () => {
    const testEmail = `reset-user-${Date.now()}@testcorp.ng`;
    const initialPassword = "OldPassword#123";
    const newPassword = "NewPassword#456";

    // 1. Register user
    const regRes = registerWorkspaceAccountViaBff(
      JSON.stringify({
        fullName: "Chidi Obi",
        email: testEmail,
        password: initialPassword,
        workspaceName: "Chidi Trading Co",
        rcNumber: "RC 777333",
      }),
    );
    expect(regRes.status).toBe(201);

    // 2. Reset password
    const resetRes = resetPasswordViaBff(
      JSON.stringify({
        email: testEmail,
        password: newPassword,
      }),
    );
    expect(resetRes.status).toBe(200);

    // 3. Old password should fail
    const oldLoginRes = loginWithCredentialsViaBff(
      JSON.stringify({
        email: testEmail,
        password: initialPassword,
      }),
    );
    expect(oldLoginRes.status).toBe(401);

    // 4. New password should succeed
    const newLoginRes = loginWithCredentialsViaBff(
      JSON.stringify({
        email: testEmail,
        password: newPassword,
      }),
    );
    expect(newLoginRes.status).toBe(200);
  });
});
