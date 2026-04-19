import { LegalPage } from "@/components/LegalPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms governing your use of SignDay.",
};

export default function TermsPage() {
  return <LegalPage filename="terms-of-service.md" title="Terms of Service" />;
}
