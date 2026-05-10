import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-8">
          <div>
            <Link href="/" className="text-2xl font-bold text-brand-600">
              SignDay
            </Link>
            <p className="text-sm text-gray-500 mt-2 max-w-xs">
              The college soccer recruiting companion for families.
            </p>
            <p className="text-xs text-gray-400 mt-4">
              Future Think LLC<br />
              788 North Oak Drive, Bronx, NY 10467
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 text-sm">
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Legal</h4>
              <ul className="space-y-2 text-gray-600">
                <li><Link href="/privacy" className="hover:text-brand-600">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-brand-600">Terms of Service</Link></li>
                <li><Link href="/delete-account" className="hover:text-brand-600">Delete My Account</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Contact</h4>
              <ul className="space-y-2 text-gray-600">
                <li><a href="mailto:tony@signdayapp.com" className="hover:text-brand-600">tony@signdayapp.com</a></li>
                <li><a href="mailto:privacy@signdayapp.com" className="hover:text-brand-600">privacy@signdayapp.com</a></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-gray-200 flex flex-col md:flex-row md:justify-between text-xs text-gray-400 gap-2">
          <p>© {new Date().getFullYear()} Future Think LLC. All rights reserved.</p>
          <p>Not affiliated with the NCAA, NAIA, or any collegiate athletic program.</p>
        </div>
      </div>
    </footer>
  );
}
