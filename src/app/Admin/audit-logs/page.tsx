import AuditLogTable from "@/components/AuditLogTable";

export default function AuditLogsPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 rounded-2xl border border-red-900/50 bg-[#1a0000] p-6">
          <h1 className="text-3xl font-black uppercase">Audit Logs</h1>
          <p className="mt-2 text-gray-400">
            A searchable record of important administrator actions and their
            changes.
          </p>
        </div>
        <AuditLogTable />
      </main>
    </div>
  );
}
