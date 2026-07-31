export function getName(user: { name?: string }): string {
  if (!user.name) throw new Error("name missing");
  return user.name;
}
