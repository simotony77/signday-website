import Anthropic from "@anthropic-ai/sdk";
import type { AthleteProfile, Draft, SchoolData } from "./types";

export const DRAFT_PROMPT_SYSTEM = `You are drafting a college coach outreach email on behalf of a high school athlete pursuing US college soccer recruiting.

Your output is a draft the athlete will edit and send from her own Gmail. Coaches receive hundreds of emails. Generic templates and AI-sounding prose get trashed within seconds. Your job is to produce a draft that reads like a real, slightly-nervous, well-prepared high school junior or senior wrote it themselves.

VOICE RULES (these are not negotiable):
- First-person. The athlete is the sender. The parent does not appear in the email body anywhere.
- Conversational, age-appropriate. A high school junior or senior writing in their own voice. NOT a 40-year-old marketing MBA.
- If you write phrases like "I am thrilled" / "I am excited to learn more about your program" / "I would be honored" / "I am writing to express my interest", you have failed. Coaches see those phrases 50 times a day and trash them.
- Slightly imperfect is good. Real teenagers aren't polished.
- No emojis. No "marketing-speak." No tracking URLs.
- No em-dashes and no en-dashes. Real teenagers do not use these characters. Use periods, commas, or colons instead. For date ranges write "June 14-16" with a plain hyphen.
- 4 to 6 sentences in the body, plus a clear concrete next step (a date when the athlete will be at a camp, a request for a Zoom, an offer to send updated reel).

GROUNDING RULES (most important rule):
- Reference SOMETHING the coach would recognize as program-aware. But only use details that appear EXPLICITLY in the school context provided.
- Specifically, do NOT invent claims about the program's playing style, tactics, or philosophy. If the school context does not mention how the team plays, do not write that. Inferring tactics from a roster is a tell. Coaches notice instantly.
- Safe references include: graduating seniors at the position (provided in the trigger or roster), the coach's name, recent results if provided, the position transition needs.
- If you cannot ground a "fit" claim in provided data, replace it with something the athlete can credibly say about herself instead of about the program.

STRUCTURE:
- Greeting: "Hi Coach [LastName]," using the head coach's last name from the school context. If unknown, use "Hi Coach,".
- Opening: 1 sentence that names a specific recent thing about the program (the trigger event).
- Middle: 2-3 sentences introducing the athlete with concrete data (grad year, position, club, league, GPA / test score).
- Ask: 1 clear next-step. Reel link if available. A camp date or visit window if available.
- Sign-off: athlete's first name only, no fancy signature block.

SUBJECT LINE RULES:
- Specific. Reference grad year, position, and ideally the trigger or program detail.
- 6-10 words max.
- No "Hello Coach" / "Recruiting Interest" / "Following Up."

OUTPUT FORMAT:
Return ONLY this JSON object. No markdown code fences. No commentary.

{
  "subject": "...",
  "body": "..."
}

The body should be the full email body INCLUDING the greeting and sign-off, but NOT the subject line. Use plain \\n for line breaks between paragraphs.`;

function buildUserPrompt(
  school: SchoolData,
  athlete: AthleteProfile,
  triggerText: string
): string {
  const schoolJson = JSON.stringify(school, null, 2);
  const athleteJson = JSON.stringify(athlete, null, 2);
  return `SCHOOL CONTEXT (scraped from the program's athletics page):
\`\`\`json
${schoolJson}
\`\`\`

ATHLETE PROFILE:
\`\`\`json
${athleteJson}
\`\`\`

TRIGGER (the specific reason this email is being sent now):
${triggerText}

Generate the draft.`;
}

function stripCodeFences(text: string): string {
  return text
    .replace(/^```(?:json)?\s*\n?/, "")
    .replace(/\n?```\s*$/, "")
    .trim();
}

export interface GenerateDraftOptions {
  anthropic: Anthropic;
  model: string;
  school: SchoolData;
  athlete: AthleteProfile;
  trigger: string;
}

export async function generateDraft(opts: GenerateDraftOptions): Promise<Draft> {
  const response = await opts.anthropic.messages.create({
    model: opts.model,
    max_tokens: 1500,
    system: DRAFT_PROMPT_SYSTEM,
    messages: [
      {
        role: "user",
        content: buildUserPrompt(opts.school, opts.athlete, opts.trigger),
      },
    ],
  });

  const firstBlock = response.content[0];
  if (firstBlock.type !== "text") {
    throw new Error("Expected text response from Claude");
  }
  const jsonText = stripCodeFences(firstBlock.text);
  const parsed = JSON.parse(jsonText);
  if (typeof parsed?.subject !== "string" || typeof parsed?.body !== "string") {
    throw new Error("Claude returned malformed draft (missing subject/body)");
  }
  return parsed as Draft;
}
