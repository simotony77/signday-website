import { LegalPage } from "@/components/LegalPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How SignDay collects, uses, and protects your information.",
};

export default function PrivacyPage() {
  return <LegalPage filename="privacy-policy.md" title="Privacy Policy" />;
}
