import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 text-slate-900 px-4">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-indigo-600">404</h1>
        <h2 className="text-2xl font-bold">Page Not Found</h2>
        <p className="text-slate-500 text-sm">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-block rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}

