import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, Mail, ArrowLeft, ShieldCheck, AlertCircle, FileText, CheckCircle2, ExternalLink } from "lucide-react";
import { Button } from "@/components/plugg/primitives";

export const Route = createFileRoute("/copyright")({
  component: CopyrightPolicyPage,
});

function CopyrightPolicyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Navigation */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Plugg</span>
            </Link>
            <div className="hidden sm:block h-4 w-px bg-border/60" />
            <Link to="/" className="hidden sm:flex items-center gap-2">
              <span className="font-extrabold tracking-tight text-base text-foreground">plugg<span className="text-primary">.</span></span>
            </Link>
          </div>

          <div className="flex items-center gap-2.5">
            <a
              href="/documents/Plugg_Copyright_Policy_and_Reporting.pdf"
              download="Plugg_Copyright_Policy_and_Reporting.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted/40 transition-colors shadow-sm"
            >
              <Download className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Download PDF</span>
            </a>
            <a
              href="mailto:support@plugg.site?subject=Copyright%20Complaint%20-%20Plugg"
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
            >
              <Mail className="h-3.5 w-3.5" />
              <span className="hidden xs:inline">Report Infringement</span>
              <span className="xs:hidden">Report</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-16 space-y-10">
        {/* Header Hero */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Official Policy · Uganda & Global</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Copyright Policy & Infringement Reporting
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            How Plugg protects music and creative work, what rights uploaders must hold, and the step-by-step procedure to report suspected infringement.
          </p>

          {/* Metadata Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
            <div className="surface-card p-3.5 rounded-xl border border-border/60">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Operator</p>
              <p className="text-xs font-semibold text-foreground mt-0.5">Atedo (Pirwoth Samuel)</p>
              <p className="text-[11px] text-muted-foreground">Pakwach, Uganda</p>
            </div>
            <div className="surface-card p-3.5 rounded-xl border border-border/60">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Platform</p>
              <p className="text-xs font-semibold text-foreground mt-0.5">Plugg Music Streaming</p>
              <a href="https://www.plugg.site" className="text-[11px] text-primary hover:underline">www.plugg.site</a>
            </div>
            <div className="surface-card p-3.5 rounded-xl border border-border/60">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Reporting Email</p>
              <p className="text-xs font-semibold text-foreground mt-0.5">support@plugg.site</p>
              <p className="text-[11px] text-muted-foreground">Subject: Copyright Complaint</p>
            </div>
            <div className="surface-card p-3.5 rounded-xl border border-border/60">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Version & Status</p>
              <p className="text-xs font-semibold text-foreground mt-0.5">23 October 2026</p>
              <p className="text-[11px] text-muted-foreground">Effective on publication</p>
            </div>
          </div>
        </div>

        {/* Notice Banner */}
        <div className="flex items-start gap-3 rounded-xl border border-border/80 bg-muted/20 p-4 text-xs leading-relaxed text-muted-foreground">
          <AlertCircle className="h-4 w-4 shrink-0 text-primary mt-0.5" />
          <div>
            <span className="font-semibold text-foreground">Publication Notice: </span>
            This policy applies to Guests, Listeners, Artists, and any person submitting a copyright complaint. It supplements the{" "}
            <a href="/documents/Plugg_Terms_and_Conditions.pdf" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">Terms & Conditions</a>
            {" "}and{" "}
            <a href="/documents/Plugg_Privacy_Policy.pdf" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">Privacy Policy</a>.
            If a provision conflicts with applicable law or a valid separately executed licensing agreement, the law and relevant agreement take precedence.
          </div>
        </div>

        {/* Policy Sections */}
        <div className="space-y-8 divide-y divide-border/40">
          {/* 01 */}
          <section className="pt-8 first:pt-0 space-y-3">
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-baseline gap-2">
              <span className="text-primary font-mono text-sm sm:text-base">01.</span>
              <span>Purpose and operator</span>
            </h2>
            <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-2">
              <p>
                Plugg is a music streaming and discovery platform operated by Atedo under the direction of Pirwoth Samuel, based in Pakwach, Uganda. This Copyright Policy explains how we protect music and creative work, what rights uploaders must hold, and how suspected infringement can be reported and addressed.
              </p>
              <p>
                This policy applies to Guests, Listeners, Artists and any other person submitting a copyright complaint. It supplements the Plugg Terms & Conditions and Privacy Policy. If a provision conflicts with applicable law or a valid, separately executed licensing agreement, the law and relevant valid agreement take precedence.
              </p>
            </div>
          </section>

          {/* 02 */}
          <section className="pt-8 space-y-3">
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-baseline gap-2">
              <span className="text-primary font-mono text-sm sm:text-base">02.</span>
              <span>Who owns the music?</span>
            </h2>
            <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-2">
              <p>
                Artists, composers, producers, performers, record labels and other rightful owners keep the rights they hold in their creative work. Plugg does not take ownership of a song merely because an Artist registers, uploads a file or creates a public profile.
              </p>
              <p>
                A single release can involve separate rights in the musical composition and lyrics, sound recording (master), performances, samples, beats, cover artwork and other materials. Permission from one contributor does not necessarily clear every right.
              </p>
            </div>
          </section>

          {/* 03 */}
          <section className="pt-8 space-y-3">
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-baseline gap-2">
              <span className="text-primary font-mono text-sm sm:text-base">03.</span>
              <span>Permitted listening and sharing</span>
            </h2>
            <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-2">
              <p>
                Guests and registered users may stream music that Plugg lawfully makes available through the intended player and share links to public Plugg pages.
              </p>
              <p>
                Unless the relevant rights holder has authorized it or the law permits it, users must not rip, download, copy, distribute, sell, re-upload, sample, publicly perform or commercially exploit protected recordings outside the permitted streaming experience. Attempts to bypass protective controls or reproduce content without authority are prohibited.
              </p>
            </div>
          </section>

          {/* 04 */}
          <section className="pt-8 space-y-3">
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-baseline gap-2">
              <span className="text-primary font-mono text-sm sm:text-base">04.</span>
              <span>What Artists must confirm before upload</span>
            </h2>
            <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-2">
              <p>
                An Artist must have the legal authority to submit a release and make it available under the necessary rights arrangements. This includes clearing any third-party beats, samples, lyrics, instrumentals, recordings, artwork and contributions; obtaining collaborator permissions; and providing truthful credits and metadata.
              </p>
              <p>
                Uploading a cover song, remix, DJ mix, sampled recording or licensed beat does not automatically make it lawful to stream. Artists must hold permissions covering Plugg&apos;s intended uses and must promptly respond if Plugg requests evidence of those permissions.
              </p>
              <p>
                Artists must not impersonate another creator, upload stolen works, misstate ownership, or manipulate streams and chart activity.
              </p>
            </div>
          </section>

          {/* 05 */}
          <section className="pt-8 space-y-3">
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-baseline gap-2">
              <span className="text-primary font-mono text-sm sm:text-base">05.</span>
              <span>Licensing music for streaming</span>
            </h2>
            <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-2">
              <p>
                Accepting the website Terms at signup confirms acceptance of account and conduct rules; it does not, by itself, replace a copyright exploitation agreement where Ugandan law requires a written contract or other formalities.
              </p>
              <p>
                Before Plugg distributes or publicly streams an uploaded release, the relevant parties must have the necessary valid authorizations and any required written, signed and registered licensing documents. Such agreements should identify the works and rights, type and scope of permitted uses, territory, duration, duties, remuneration and method of payment, and conditions for ending or withdrawing rights.
              </p>
              <p>
                At launch, Plugg offers free public streaming and does not offer in-platform subscriptions, advertising payments or Artist royalty payouts. The absence of an in-app payout feature does not remove any remuneration or licensing obligations imposed by law or applicable rights agreements. Plugg must resolve such obligations before making the affected music available.
              </p>
            </div>
          </section>

          {/* 06 */}
          <section className="pt-8 space-y-3">
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-baseline gap-2">
              <span className="text-primary font-mono text-sm sm:text-base">06.</span>
              <span>Upload checks and removal powers</span>
            </h2>
            <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-2">
              <p>
                Plugg does not intend to require routine manual administrator approval for every eligible upload. The platform may use technical file checks, metadata requirements and uploader declarations, but these do not guarantee copyright clearance.
              </p>
              <p>
                Plugg may suspend publication, block streaming, disable a track, ask for evidence of rights, remove disputed content or restrict an account if there is a reasonable rights concern, credible complaint, valid legal notice or other legal requirement.
              </p>
              <p>
                Automated publication is not permission to infringe another person&apos;s rights. Plugg may apply checks or restrictions after a release becomes visible.
              </p>
            </div>
          </section>

          {/* 07 - Highlighted reporting section */}
          <section className="pt-8 space-y-4">
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-baseline gap-2">
              <span className="text-primary font-mono text-sm sm:text-base">07.</span>
              <span>Reporting a possible infringement</span>
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              If you own rights in a work, or are authorized to act for the owner, send an email to{" "}
              <a href="mailto:support@plugg.site?subject=Copyright%20Complaint%20-%20Plugg" className="text-primary font-semibold hover:underline">
                support@plugg.site
              </a>{" "}
              with the subject <span className="font-semibold text-foreground">Copyright Complaint - Plugg</span>. You may also report impersonation, unauthorized use of artwork or misleading ownership claims.
            </p>

            {/* Checklist of what to include */}
            <div className="surface-card p-5 rounded-2xl border border-primary/20 bg-primary/[0.02] space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <span>Information required in your report (7 Items):</span>
              </p>
              <ul className="text-xs sm:text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                  <span><strong>1. Contact details:</strong> Your full name and reply email address.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                  <span><strong>2. Protected work:</strong> Clear identification of the musical work, sound recording, or artwork claimed to be infringed.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                  <span><strong>3. Location on Plugg:</strong> Specific Plugg URL, release link, or Artist profile.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                  <span><strong>4. Rights statement:</strong> The specific rights you hold or are authorized to represent (e.g., master owner, composer, publisher).</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                  <span><strong>5. Infringement description:</strong> A clear explanation of how the material infringes your rights.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                  <span><strong>6. Supporting evidence:</strong> Contracts, URSB registration certificates, original files, or distribution records.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                  <span><strong>7. Good-faith confirmation:</strong> A statement that the information provided is accurate and made in good faith.</span>
                </li>
              </ul>
              <div className="pt-2">
                <a
                  href="mailto:support@plugg.site?subject=Copyright%20Complaint%20-%20Plugg"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <Mail className="h-3.5 w-3.5" />
                  <span>Compose Report Email</span>
                </a>
              </div>
            </div>
          </section>

          {/* 08 */}
          <section className="pt-8 space-y-3">
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-baseline gap-2">
              <span className="text-primary font-mono text-sm sm:text-base">08.</span>
              <span>How we handle complaints</span>
            </h2>
            <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-2">
              <p>
                We review reports according to their detail, credibility, urgency and applicable legal requirements. Depending on the circumstances, we may request further evidence, restrict access during investigation, contact the uploader, preserve necessary records, remove content or direct the parties to an appropriate authority.
              </p>
              <p>
                Where the law requires blocking, take-down or other action, Plugg will follow the applicable requirements. We do not guarantee that every complaint will result in a removal, nor do we commit to an arbitrary fixed response period in this policy.
              </p>
              <p>
                We may take action without advance notice to the uploader when necessary to comply with the law, protect rights or prevent further harm.
              </p>
            </div>
          </section>

          {/* 09 */}
          <section className="pt-8 space-y-3">
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-baseline gap-2">
              <span className="text-primary font-mono text-sm sm:text-base">09.</span>
              <span>If your music was reported or removed</span>
            </h2>
            <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-2">
              <p>
                An Artist may request review by emailing{" "}
                <a href="mailto:support@plugg.site?subject=Copyright%20Review%20-%20Plugg" className="text-primary hover:underline font-semibold">
                  support@plugg.site
                </a>{" "}
                with the subject <span className="font-semibold text-foreground">Copyright Review - Plugg</span>, identifying the release and explaining why the content is authorized. Include relevant contracts, licences, original project files, credits, or other supporting evidence as appropriate.
              </p>
              <p>
                We may contact the complainant, maintain the restriction while checking the evidence or restore the release when we are satisfied that restoration is lawful and appropriate. A request for review does not require Plugg to restore a disputed recording where a valid legal order or outstanding rights restriction applies.
              </p>
            </div>
          </section>

          {/* 10 */}
          <section className="pt-8 space-y-3">
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-baseline gap-2">
              <span className="text-primary font-mono text-sm sm:text-base">10.</span>
              <span>Repeat violations and false reports</span>
            </h2>
            <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-2">
              <p>
                Plugg may warn, restrict or suspend upload privileges or accounts involved in repeated or serious copyright violations, impersonation, fraudulent releases or manipulation of the complaint process.
              </p>
              <p>
                Users must not knowingly submit false or misleading infringement claims. We may decline unsupported requests and take proportionate action against misuse of reporting tools.
              </p>
            </div>
          </section>

          {/* 11 */}
          <section className="pt-8 space-y-3">
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-baseline gap-2">
              <span className="text-primary font-mono text-sm sm:text-base">11.</span>
              <span>Privacy, records and user data</span>
            </h2>
            <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-2">
              <p>
                Plugg uses information supplied in copyright complaints to assess rights claims, contact relevant parties, keep necessary records and comply with legal obligations. We may disclose relevant information to the uploader, involved rights holders, service providers or competent authorities where lawful and necessary.
              </p>
              <p>
                Private Listener profiles and individual listening histories are not made public through copyright reporting. Personal data is handled in accordance with the Plugg Privacy Policy and applicable law.
              </p>
            </div>
          </section>

          {/* 12 */}
          <section className="pt-8 space-y-3">
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-baseline gap-2">
              <span className="text-primary font-mono text-sm sm:text-base">12.</span>
              <span>Changes, contact and applicable law</span>
            </h2>
            <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-2">
              <p>
                This policy takes effect when first published at www.plugg.site and may be updated as Plugg develops or legal requirements change. Material changes will be communicated where appropriate.
              </p>
              <p>
                This policy is intended to operate in accordance with Ugandan law, including the Copyright and Neighbouring Rights Act, Cap. 222, as amended in 2026, and relevant electronic transactions law. It is not a substitute for a court, Registrar or other competent authority&apos;s decision.
              </p>
            </div>
          </section>
        </div>

        {/* References & Document Download Box */}
        <div className="pt-8 border-t border-border/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground">Statutory References & Authorities:</p>
            <p>
              Uganda Copyright and Neighbouring Rights Act, Cap. 222 (as amended in 2026) ·{" "}
              <a href="https://www.wipo.int/wipolex/en/legislation/details/24056" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">
                WIPO Lex <ExternalLink className="h-3 w-3" />
              </a>
              {" · "}
              <a href="https://ursb.go.ug/how-to-register-copyright-in-uganda/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">
                URSB Registration <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </div>
          <a
            href="/documents/Plugg_Copyright_Policy_and_Reporting.pdf"
            download="Plugg_Copyright_Policy_and_Reporting.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted/40 transition-colors shadow-sm"
          >
            <Download className="h-4 w-4 text-primary" />
            <span>Official Policy PDF</span>
          </a>
        </div>
      </main>
    </div>
  );
}
