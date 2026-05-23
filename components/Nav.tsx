import Link from "next/link";
import Image from "next/image";

export function Nav() {
  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
        <Link
          href="/"
          aria-label="SignDay home"
          className="flex items-center gap-2 text-xl font-bold text-brand-600 hover:text-brand-700 transition-colors cursor-pointer"
        >
          <Image
            src="/logo.png"
            alt="SignDay"
            width={36}
            height={36}
            className="h-9 w-9 object-contain"
            priority
          />
          <span>SignDay</span>
        </Link>
        <div className="flex items-center gap-3 md:gap-6 text-sm text-gray-600">
          <Link href="/" className="hidden md:inline hover:text-brand-600">Home</Link>
          <Link
            href="/demo"
            className="bg-brand-600 hover:bg-brand-700 text-white font-semibold px-3 md:px-4 py-2 rounded-xl"
          >
            Try the agent
          </Link>
          <Link href="/account" className="hover:text-brand-600">Account</Link>
          <Link href="/privacy" className="hidden md:inline hover:text-brand-600">Privacy</Link>
          <Link href="/terms" className="hidden md:inline hover:text-brand-600">Terms</Link>
          <a href="mailto:tony@signdayapp.com" className="hidden md:inline hover:text-brand-600">Contact</a>
        </div>
      </div>
    </nav>
  );
}
