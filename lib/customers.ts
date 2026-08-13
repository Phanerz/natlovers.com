import {db, users} from "@/lib/db";

export type CustomerView = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
};

// "Customer count" is every row in the users table — there's no separate
// customer/admin flag in the schema (admin access is gated by the
// ADMIN_EMAILS allowlist at the auth layer, not a DB column), so an admin
// who has signed in counts here too, same as any other real account.
export async function getCustomerCount(): Promise<number> {
  const rows = await db.select({id: users.id}).from(users);
  return rows.length;
}

export async function getCustomers(): Promise<CustomerView[]> {
  return db.select({id: users.id, name: users.name, email: users.email, image: users.image}).from(users);
}
