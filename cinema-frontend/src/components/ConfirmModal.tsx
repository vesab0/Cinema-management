type ConfirmModalProps = {
  message?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmModal({ message = "Are you sure you want to delete this?", onConfirm, onCancel }: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onCancel}>
      <div className="bg-dash-card rounded-xl shadow-xl w-full max-w-sm mx-4 p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-base font-semibold text-white mb-2">Confirm deletion</h2>
        <p className="text-sm text-white/50 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all active:scale-95"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
