import { useEffect, useState } from "react";
import DataTable, { type Column } from "../../components/Table";
import { usersApi } from "../../api";
import type { UserRow } from "../../types";

const columns: Column<UserRow>[] = [
  { key: "fullName",  label: "Full Name"  },
  { key: "email",     label: "Email",     type: "email" },
  { key: "phone",     label: "Phone",     type: "tel"   },
  { key: "role",      label: "Role",      type: "select", options: ["user", "admin", "staff"] },
  { key: "createdAt", label: "Created At" },
];

export default function Users() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    usersApi
      .list()
      .then((data) => setRows(data))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (row: UserRow) => {
    try { await usersApi.update(row); }
    catch (e) { setError(String(e)); }
  };

  const handleDelete = async (row: UserRow) => {
    try { await usersApi.remove(row.id); }
    catch (e) { setError(String(e)); }
  };

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>;
  if (error)   return <div className="p-8 text-red-500">Error: {error}</div>;

  return (
    <DataTable<UserRow>
      showCreate={false}
      title="Users"
      columns={columns}
      rows={rows}
      keyField="id"
      onSave={handleSave}
      onDelete={handleDelete}
    />
  );
}
