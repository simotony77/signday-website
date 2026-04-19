import { readFileSync } from "node:fs";
import { join } from "node:path";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Nav } from "./Nav";
import { Footer } from "./Footer";

interface LegalPageProps {
  filename: "privacy-policy.md" | "terms-of-service.md";
  title: string;
}

export function LegalPage({ filename, title }: LegalPageProps) {
  const filePath = join(process.cwd(), "content", filename);
  const markdown = readFileSync(filePath, "utf-8");

  return (
    <>
      <Nav />
      <main className="max-w-4xl mx-auto px-6 py-12 md:py-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">{title}</h1>
        <article className="prose prose-gray prose-headings:font-semibold prose-headings:text-gray-900 prose-h1:hidden prose-a:text-brand-600 prose-strong:text-gray-900 max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
        </article>
      </main>
      <Footer />
    </>
  );
}
