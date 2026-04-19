import Link from "next/link";

export function Nav() {
  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
        <Link href="/" className="text-xl font-bold text-brand-600">
          SignDay
        </Link>
        <div className="hidden md:flex items-center gap-8 text-sm">
          <a href="/#features" className="text-gray-600 hover:text-brand-600">Features</a>
          <a href="/#pricing" className="text-gray-600 hover:text-brand-600">Pricing</a>
          <a href="/#faq" className="text-gray-600 hover:text-brand-600">FAQ</a>
        </div>
        <a
          href="#download"
          className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
        >
          Download
        </a>
      </div>
    </nav>
  );
}
