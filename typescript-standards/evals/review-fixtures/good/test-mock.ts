import { saveUser } from "./user-service";

interface User {
  id: string;
  name: string;
  email: string;
}

const buildUser = (overrides: Partial<User> = {}): User => ({
  id: "1",
  name: "Test User",
  email: "test@example.com",
  ...overrides,
});

it("saves the user", async () => {
  await saveUser(buildUser());
});
