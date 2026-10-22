import { SovereignWatermark } from '@/components/documents/SovereignWatermark';
import { parseDocumentSections, type DocumentSection } from '@/lib/documentParse';
import { cn } from '@/lib/utils';

interface DocumentViewProps {
  text: string;
  title?: string;
  subtitle?: string;
  className?: string;
  maxHeightClass?: string;
  blurred?: boolean;
}

function SectionCard({ section }: { section: DocumentSection }) {
  return (
    <section className="sovereign-doc-section rounded-xl border border-slate-800/80 bg-slate-900/60 p-5">
      {section.title ? (
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-amber-400">
          {section.title}
        </h3>
      ) : null}
      <div className="space-y-3 text-[15px] leading-relaxed text-slate-200">
        {section.paragraphs.map((paragraph, index) => (
          <p key={`p-${index}`}>{paragraph}</p>
        ))}
        {section.bullets.length > 0 ? (
          <ul className="space-y-1.5 pl-1">
            {section.bullets.map((item, index) => (
              <li key={`b-${index}`} className="flex gap-2.5">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}

function DocumentFrame({
  title,
  subtitle,
  sections,
  className,
  maxHeightClass,
  blurred,
}: {
  title: string;
  subtitle: string;
  sections: DocumentSection[];
  className?: string;
  maxHeightClass?: string;
  blurred?: boolean;
}) {
  return (
    <article
      className={cn(
        'relative overflow-hidden rounded-xl border border-slate-800/80 bg-[#0B0F17] font-sans',
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950 via-[#0B0F17] to-zinc-950" />
      <SovereignWatermark />
      <div
        className={cn(
          'relative z-[1] p-6 sm:p-8',
          maxHeightClass,
          maxHeightClass ? 'overflow-y-auto' : '',
          blurred ? 'select-none blur-[2px] pointer-events-none' : '',
        )}
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-400/90">{subtitle}</p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-50 sm:text-3xl">{title}</h2>
        <div className="mt-6 space-y-4">
          {sections.map((section, index) => (
            <SectionCard key={`${section.title}-${index}`} section={section} />
          ))}
        </div>
      </div>
    </article>
  );
}

export function CVDocumentView({
  text,
  title = 'Generated CV',
  subtitle = 'Sovereign · Curriculum Vitae',
  className,
  maxHeightClass = 'max-h-[600px]',
  blurred = false,
}: DocumentViewProps) {
  const sections = parseDocumentSections(text);
  const safeSections = sections.length
    ? sections
    : [{ title: 'Profile', paragraphs: [text.trim() || 'No CV content yet.'], bullets: [] }];

  return (
    <DocumentFrame
      title={title}
      subtitle={subtitle}
      sections={safeSections}
      className={className}
      maxHeightClass={maxHeightClass}
      blurred={blurred}
    />
  );
}

export function ProposalDocumentView({
  text,
  title = 'Tailored Proposal',
  subtitle = 'Sovereign · Proposal',
  className,
  maxHeightClass = 'max-h-[280px]',
  blurred = false,
}: DocumentViewProps) {
  const sections = parseDocumentSections(text);
  const safeSections = sections.length
    ? sections
    : [{ title: 'Proposal', paragraphs: text.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean), bullets: [] }];

  return (
    <DocumentFrame
      title={title}
      subtitle={subtitle}
      sections={safeSections}
      className={className}
      maxHeightClass={maxHeightClass}
      blurred={blurred}
    />
  );
}
