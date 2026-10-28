export default function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="border border-red-200 bg-red-50 p-6 text-center font-inter">
      <p className="text-sm text-red-800">{message}</p>
      <button onClick={onRetry} className="mt-4 border border-red-300 px-5 py-2 text-xs tracking-wider text-red-900">TRY AGAIN</button>
    </div>
  );
}
