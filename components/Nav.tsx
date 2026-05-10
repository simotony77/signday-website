import Link from "next/link";

export function Nav() {
  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
        <Link href="/" className="text-xl font-bold text-brand-600">
          SignDay
        </Link>
        <div className="hidden md:flex items-center gap-6 text-sm text-gray-600">
          <Link href="/privacy" className="hover:text-brand-600">Privacy</Link>
          <Link href="/terms" className="hover:text-brand-600">Terms</Link>
          <a href="mailto:tony@signdayapp.com" className="hover:text-brand-600">Contact</a>
        </div>
      </div>
    </nav>
  );
}
