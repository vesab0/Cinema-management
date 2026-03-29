import { useEffect, useState } from "react";

export type Column<T> = {
  key: keyof T;
  label: string;
  type?: "text" | "email" | "tel" | "number" | "select";
  options?: string[];
  renderField?: (value: unknown, onChange: (val: unknown) => void) => React.ReactNode;
  renderCell?: (value: unknown) => React.ReactNode;
  hideInModal?: boolean;
  hideInTable?: boolean;
};

type TableProps<T extends Record<string, unknown>> = {
  title?: string;
  columns: Column<T>[];
  rows: T[];
  onSave?: (row: T) => void;
  onDelete?: (row: T) => void;
  onCreate?: (row: T) => void;
  defaultRow?: Partial<T>;
  showCreate?: boolean;
};

export default function Table<T extends Record<string, unknown>>({
  title = "Table",
  columns,
  rows: initialRows,
  onSave,
  onDelete,
  onCreate,
  defaultRow = {},
  showCreate = true,
}: TableProps<T>) {
  const [rows, setRows] = useState<T[]>(initialRows);
  const [editingRow, setEditingRow] = useState<T | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [creatingRow, setCreatingRow] = useState<T | null>(null);
  const [saved, setSaved] = useState<Record<number, boolean>>({});

  useEffect(() => { setRows(initialRows); }, [initialRows]);

  const flashSaved = (i: number) => {
    setSaved((p) => ({ ...p, [i]: true }));
    setTimeout(() => setSaved((p) => ({ ...p, [i]: false })), 1800);
  };

  const blankRow = (): T => {
    const empty = columns.reduce((acc, col) => {
      acc[col.key as string] = col.options?.[0] ?? "";
      return acc;
    }, {} as Record<string, unknown>);
    return { ...empty, ...defaultRow } as T;
  };

  const updateDropdown = (rowIndex: number, key: keyof T, value: string) => {
    const updated = rows.map((r, i) => (i === rowIndex ? { ...r, [key]: value } : r));
    setRows(updated);
    onSave?.(updated[rowIndex]);
    flashSaved(rowIndex);
  };

  const openEditModal = (rowIndex: number) => {
    setEditingIndex(rowIndex);
    setEditingRow({ ...rows[rowIndex] });
  };
  const closeEditModal = () => { setEditingIndex(null); setEditingRow(null); };

  const handleEditSave = () => {
    if (editingRow === null || editingIndex === null) return;
    const updated = rows.map((r, i) => (i === editingIndex ? editingRow : r));
    setRows(updated);
    onSave?.(editingRow);
    flashSaved(editingIndex);
    closeEditModal();
  };

  const openCreateModal = () => setCreatingRow(blankRow());
  const closeCreateModal = () => setCreatingRow(null);

  const handleCreateSave = () => {
    if (creatingRow === null) return;
    setRows((prev) => [...prev, creatingRow]);
    onCreate?.(creatingRow);
    closeCreateModal();
  };

  const handleDelete = (rowIndex: number) => {
    onDelete?.(rows[rowIndex]);
    setRows((prev) => prev.filter((_, i) => i !== rowIndex));
  };

  const tableColumns = columns.filter((col) => !col.hideInTable);
  const modalColumns = columns.filter((col) => !col.hideInModal && col.type !== "select");

  return (
    <>
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-800 tracking-tight">{title}</h1>
          {showCreate && (
            <button
              onClick={openCreateModal}
              className="text-sm font-medium bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-700 active:scale-95 transition-all"
            >
              + Create
            </button>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                {tableColumns.map((col) => (
                  <th key={String(col.key)} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-widest px-5 py-3">
                    {col.label}
                  </th>
                ))}
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={tableColumns.length + 1} className="text-center text-gray-400 text-sm py-12">
                    No rows yet.
                  </td>
                </tr>
              ) : (
                rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-b border-gray-100 last:border-0 even:bg-gray-50 hover:bg-gray-100 transition-colors">
                    {tableColumns.map((col) => (
                      <td key={String(col.key)} className="px-5 py-2.5">
                        {col.type === "select" ? (
                          <select
                            className="w-full bg-transparent text-sm text-gray-700 border border-transparent rounded px-1.5 py-1 hover:border-gray-300 focus:border-gray-400 focus:bg-gray-50 outline-none cursor-pointer transition-all"
                            value={String(row[col.key] ?? "")}
                            onChange={(e) => updateDropdown(rowIndex, col.key, e.target.value)}
                          >
                            {(col.options ?? []).map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : col.renderCell ? (
                          col.renderCell(row[col.key])
                        ) : (
                          <span className="text-sm text-gray-700 px-1.5">
                            {String(row[col.key] ?? "")}
                          </span>
                        )}
                      </td>
                    ))}
                    <td className="px-5 py-2.5">
                      <div className="flex justify-end items-center gap-1">
                        {saved[rowIndex] && (
                          <span className="text-xs text-green-500 font-medium mr-1">Saved ✓</span>
                        )}
                        <button onClick={() => openEditModal(rowIndex)} title="Edit" className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors active:scale-95">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button onClick={() => handleDelete(rowIndex)} title="Delete" className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors active:scale-95">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingRow !== null && (
        <Modal
          title={`Edit ${title.replace(/s$/, "")}`}
          columns={modalColumns}
          row={editingRow}
          onChange={(key, value) => setEditingRow((prev) => prev ? { ...prev, [key]: value } : prev)}
          onCancel={closeEditModal}
          onConfirm={handleEditSave}
          confirmLabel="Save"
        />
      )}

      {creatingRow !== null && (
        <Modal
          title={`New ${title.replace(/s$/, "")}`}
          columns={modalColumns}
          row={creatingRow}
          onChange={(key, value) => setCreatingRow((prev) => prev ? { ...prev, [key]: value } : prev)}
          onCancel={closeCreateModal}
          onConfirm={handleCreateSave}
          confirmLabel="Create"
        />
      )}
    </>
  );
}

type ModalProps<T extends Record<string, unknown>> = {
  title: string;
  columns: Column<T>[];
  row: T;
  onChange: (key: keyof T, value: unknown) => void;
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel: string;
};

function Modal<T extends Record<string, unknown>>({
  title, columns, row, onChange, onCancel, onConfirm, confirmLabel,
}: ModalProps<T>) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onCancel}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
          <button onClick={onCancel} className="p-1.5 rounded-md text-gray-400 hover:bg-gray-100 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {columns.map((col) => (
            <div key={String(col.key)}>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">
                {col.label}
              </label>
              {col.renderField ? (
                col.renderField(row[col.key], (val) => onChange(col.key, val))
              ) : (
                <input
                  type={col.type ?? "text"}
                  value={String(row[col.key] ?? "")}
                  onChange={(e) => onChange(col.key, e.target.value)}
                  className="w-full text-sm text-gray-800 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition-all"
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onCancel} className="text-sm font-medium px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all">
            Cancel
          </button>
          <button onClick={onConfirm} className="text-sm font-medium px-4 py-2 rounded-lg bg-gray-500 text-white hover:bg-gray-600 active:scale-95 transition-all">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}