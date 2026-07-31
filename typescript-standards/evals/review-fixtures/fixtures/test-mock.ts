import { saveUser } from "./user-service";

it("saves the user", async () => {
  const user = { id: "1" } as any;
  await saveUser(user);
});
