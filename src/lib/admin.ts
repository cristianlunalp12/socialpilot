/** App owners (you), not workspace admins. Set ADMIN_EMAILS="a@x.com,b@y.com". */
export function isAppAdmin(email: string) {
  const list = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return list.includes(email.toLowerCase());
}
