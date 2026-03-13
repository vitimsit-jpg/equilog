"use client";

export default function AdminError({ error }: { error: Error & { digest?: string } }) {
  return (
    <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center p-8">
      <div className="max-w-lg w-full bg-red-500/10 border border-red-500/30 rounded-2xl p-6">
        <h1 className="text-lg font-bold text-red-400 mb-2">Erreur admin</h1>
        <p className="text-sm text-gray-300 mb-4 font-mono break-all">{error.message}</p>
        {error.digest && (
          <p className="text-2xs text-gray-600 font-mono">Digest: {error.digest}</p>
        )}
      </div>
    </div>
  );
}
