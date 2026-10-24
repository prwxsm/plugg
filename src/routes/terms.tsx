import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, ArrowLeft, ShieldCheck, AlertCircle, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
});

function TermsPage() {
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
              href="/documents/Plugg_Terms_and_Conditions.pdf"
              download="Plugg_Terms_and_Conditions.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted/40 transition-colors shadow-sm"
            >
              <Download className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Download PDF</span>
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
            <span>Platform Rules · Uganda & Global</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Terms & Conditions
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Platform rules for Guests, Listeners, and Artists. Covers free music discovery, accounts, licensing compliance, and acceptable conduct.
          </p>

          {/* Metadata Cards */}
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
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Support & Legal</p>
              <p className="text-xs font-semibold text-foreground mt-0.5">support@plugg.site</p>
              <p className="text-[11px] text-muted-foreground">Subject: Terms & Inquiries</p>
            </div>
            <div className="surface-card p-3.5 rounded-xl border border-border/60">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Version & Status</p>
              <p className="text-xs font-semibold text-foreground mt-0.5">22 October 2026</p>
              <p className="text-[11px] text-muted-foreground">Effective on publication</p>
            </div>
          </div>
        </div>

        {/* Notice Banner */}
        <div className="flex items-start gap-3 rounded-xl border border-border/80 bg-muted/20 p-4 text-xs leading-relaxed text-muted-foreground">
          <AlertCircle className="h-4 w-4 shrink-0 text-primary mt-0.5" />
          <div>
            <span className="font-semibold text-foreground">Publication Notice: </span>
            These Terms apply to all visitors and users of Plugg. They operate in conjunction with our{" "}
            <a href="/privacy" className="text-primary hover:underline font-medium">Privacy Policy</a>
            {" "}and{" "}
            <a href="/copyright" className="text-primary hover:underline font-medium">Copyright Policy & Infringement Reporting</a>.
            If a provision conflicts with applicable law or a separately executed valid licensing agreement, the law and relevant agreement take precedence.
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-8 divide-y divide-border/40">
          {/* 01 */}
          <section className="pt-8 first:pt-0 space-y-3">
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-baseline gap-2">
              <span className="text-primary font-mono text-sm sm:text-base">01.</span>
              <span>Who operates Plugg and what these Terms cover</span>
            </h2>
            <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-2">
              <p>
                Plugg is a music streaming and discovery platform operated by Atedo, under the direction of Pirwoth Samuel, based in Pakwach, Uganda. In these Terms, &ldquo;Plugg&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo; and &ldquo;us&rdquo; refer to the platform operator. The official website is www.plugg.site.
              </p>
              <p>
                These Terms apply to browsing, music streaming, registered accounts, artist profiles, dashboards and content submissions. Use of the service is also subject to applicable law and our Privacy Policy. If you do not accept the applicable Terms, do not use the service.
              </p>
            </div>
          </section>

          {/* 02 */}
          <section className="pt-8 space-y-3">
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-baseline gap-2">
              <span className="text-primary font-mono text-sm sm:text-base">02.</span>
              <span>Age requirement and registration</span>
            </h2>
            <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-2">
              <p>
                Plugg is intended for adults aged 18 or older. A person under 18 must not register for or use the service. Users are responsible for providing accurate account information. We may request reasonable evidence of age or identity where needed.
              </p>
              <p>
                Account registration offers two roles: Listener and Artist. A Guest is an unregistered visitor, not a signup role. Each registered user must accept the applicable Terms before an account is created. Email verification and other security steps may be required.
              </p>
            </div>
          </section>

          {/* 03 */}
          <section className="pt-8 space-y-3">
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-baseline gap-2">
              <span className="text-primary font-mono text-sm sm:text-base">03.</span>
              <span>Guest access</span>
            </h2>
            <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-2">
              <p>
                Guests may browse public Home and Discover pages, search, view artist profiles and releases, share public links, and stream music available on Plugg without logging in.
              </p>
              <p>
                Actions that save or personalize a user experience &mdash; such as likes, follows, playlists and account history &mdash; require login or registration. When feasible, Plugg may restore an interrupted action after successful authentication. Guest access does not allow uploading, downloading protected audio, or accessing creator management tools.
              </p>
            </div>
          </section>

          {/* 04 */}
          <section className="pt-8 space-y-3">
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-baseline gap-2">
              <span className="text-primary font-mono text-sm sm:text-base">04.</span>
              <span>Listener accounts</span>
            </h2>
            <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-2">
              <p>
                A Listener can stream music and use available features such as likes, follows, playlists, saved content, account preferences, listening history, recommendations and updates.
              </p>
              <p>
                Listener profiles are private. They are for the account holder and are not offered as public discovery profiles. Public artist pages may display aggregated engagement such as follower counts, without revealing private Listener activity.
              </p>
              <p>
                Listeners must safeguard their accounts, respect other users and rights holders, and avoid fraudulent activity or unauthorized attempts to reach artist-only features.
              </p>
            </div>
          </section>

          {/* 05 */}
          <section className="pt-8 space-y-3">
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-baseline gap-2">
              <span className="text-primary font-mono text-sm sm:text-base">05.</span>
              <span>Artist accounts and public profiles</span>
            </h2>
            <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-2">
              <p>
                Artists can access standard listening features plus an Artist Dashboard to create a public artist profile, provide artist biographies and imagery, upload music, manage releases and review available performance information.
              </p>
              <p>
                Artist profiles are public. An Artist should only submit details and images they are permitted to publish. Future creator accounts (such as producers or DJs) may also have public profiles if Plugg launches those roles; future manager accounts are not intended to be public.
              </p>
              <p>
                Artist status does not grant an automatic right to publish third-party recordings, compositions, performances, beats, samples, artwork or other protected materials.
              </p>
            </div>
          </section>

          {/* 06 */}
          <section className="pt-8 space-y-3">
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-baseline gap-2">
              <span className="text-primary font-mono text-sm sm:text-base">06.</span>
              <span>Copyright ownership and music licensing</span>
            </h2>
            <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-2">
              <p>
                Copyright remains with the artist and other rightful owners. Plugg does not acquire ownership of music simply because an Artist registers or uploads it. Artists must hold and document rights to each relevant sound recording, musical composition, performance and cover image.
              </p>
              <p>
                Accepting website Terms at signup records agreement to platform conduct and account rules. It is not represented as a substitute for any separately required music exploitation or licensing contract. Before Plugg makes any recording available for public streaming, the authorized rights holder and Plugg must put in place licensing documentation that meets applicable Ugandan requirements, including written and signed terms, remuneration provisions and registration where required.
              </p>
              <p>
                A compliant licence should expressly address non-exclusive or exclusive use, hosting and technical copying, on-demand streaming, public communication, promotion, territorial scope, duration, duties, remuneration and payment method, termination and rights withdrawal. Plugg will not treat the absence of an in-app payment system as a waiver of legally due remuneration.
              </p>
              <p>
                Artists authorize Plugg to display their self-submitted public profile information, non-music images and metadata as needed to operate and promote their Plugg pages, subject to applicable rights and removal requests. Rights to reproduce and stream music are addressed separately as described above.
              </p>
            </div>
          </section>

          {/* 07 */}
          <section className="pt-8 space-y-3">
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-baseline gap-2">
              <span className="text-primary font-mono text-sm sm:text-base">07.</span>
              <span>Music uploads: automated checks, no routine prior approval</span>
            </h2>
            <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-2">
              <p>
                At launch, Plugg does not require routine manual administrator approval before eligible releases go live. Uploads must pass relevant system requirements, file and metadata checks, and required rights declarations. Automated checks do not guarantee that content is lawful or free from infringement.
              </p>
              <p>
                The uploader represents that release credits are accurate and that all necessary permissions have been obtained for collaborators, samples, beats, lyrics, recordings, artwork and other submitted materials. Uploaders must properly identify explicit content and refrain from presenting someone else&apos;s music as their own.
              </p>
              <p>
                Plugg may delay, disable or remove a track, restrict access, request evidence or suspend an account when rights are disputed, requirements are not met, fraud is suspected or law requires action. Plugg may review complaints after publication. Artists can seek a review of an enforcement decision at support@plugg.site.
              </p>
            </div>
          </section>

          {/* 08 */}
          <section className="pt-8 space-y-3">
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-baseline gap-2">
              <span className="text-primary font-mono text-sm sm:text-base">08.</span>
              <span>Permitted streaming and unacceptable conduct</span>
            </h2>
            <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-2">
              <p>
                Music is offered for personal listening through Plugg&apos;s intended player, subject to applicable licensing conditions. Unless expressly authorized or permitted by law, users must not rip, copy, redistribute, resell, commercially exploit or circumvent access controls for protected content.
              </p>
              <p>
                Users must not hack the service, misuse APIs, scrape data unlawfully, upload malware, impersonate others, harass users, or generate artificial streams, followers or likes. Plugg may investigate and limit abusive traffic or accounts.
              </p>
            </div>
          </section>

          {/* 09 */}
          <section className="pt-8 space-y-3">
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-baseline gap-2">
              <span className="text-primary font-mono text-sm sm:text-base">09.</span>
              <span>Music discovery and artist metrics</span>
            </h2>
            <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-2">
              <p>
                Plugg may highlight Featured Releases, New Releases, Featured Artists, Rising Artists and Trending Songs using editorial choices, release metadata or legitimate listener activity. Rankings and recommendations can change and do not guarantee artist exposure or income.
              </p>
              <p>
                Artist metrics may include aggregate stream counts, followers and other performance indicators. Plugg may filter fraudulent traffic and correct inaccurate statistics.
              </p>
            </div>
          </section>

          {/* 10 */}
          <section className="pt-8 space-y-3">
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-baseline gap-2">
              <span className="text-primary font-mono text-sm sm:text-base">10.</span>
              <span>Launch pricing, future advertising and earnings</span>
            </h2>
            <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-2">
              <p>
                At launch, public music streaming is free. Plugg does not currently offer paid subscriptions, advertising placements or an in-platform artist royalty-payment dashboard.
              </p>
              <p>
                Plugg may consider subscriptions, advertising, promotion and artist monetization in the future. These features will not apply retroactively without appropriate notices, revised terms and agreements, and legally necessary permissions. The present absence of automated payouts does not cancel royalties or remuneration that may be due under law or a valid licence.
              </p>
            </div>
          </section>

          {/* 11 */}
          <section className="pt-8 space-y-3">
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-baseline gap-2">
              <span className="text-primary font-mono text-sm sm:text-base">11.</span>
              <span>Copyright reports and disputes</span>
            </h2>
            <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-2">
              <p>
                To report suspected infringement, email support@plugg.site with your contact information, the work and relevant rights, the disputed Plugg URL, and enough detail to assess the issue. Please identify whether you are the owner or an authorized representative.
              </p>
              <p>
                For detailed instructions and statutory complaint requirements, refer to our dedicated{" "}
                <a href="/copyright" className="text-primary font-semibold hover:underline">
                  Copyright Policy & Infringement Reporting
                </a>{" "}
                page.
              </p>
            </div>
          </section>

          {/* 12 */}
          <section className="pt-8 space-y-3">
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-baseline gap-2">
              <span className="text-primary font-mono text-sm sm:text-base">12.</span>
              <span>Account security, suspension and deletion</span>
            </h2>
            <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-2">
              <p>
                Users must keep passwords and access details secure and promptly report suspected compromise. Plugg may restrict or terminate accounts for serious or repeated violations, infringement, fraud or security risks. Where reasonable, we will explain the action and provide a review route.
              </p>
              <p>
                Users can request account deletion through account settings. Removing an account does not automatically erase information that Plugg must retain for disputes, security, legal compliance or valid licensing obligations. The Privacy Policy explains these practices.
              </p>
            </div>
          </section>

          {/* 13 */}
          <section className="pt-8 space-y-3">
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-baseline gap-2">
              <span className="text-primary font-mono text-sm sm:text-base">13.</span>
              <span>Service availability and future updates</span>
            </h2>
            <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-2">
              <p>
                We work to make Plugg available, but maintenance, network issues and licensing changes may affect service. Functions may change or be removed, subject to applicable obligations. Major changes to these Terms will be posted on our website and communicated where required. Users may need to accept revised Terms before continuing to use affected services.
              </p>
            </div>
          </section>

          {/* 14 */}
          <section className="pt-8 space-y-3">
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-baseline gap-2">
              <span className="text-primary font-mono text-sm sm:text-base">14.</span>
              <span>Liability, applicable law and complaints</span>
            </h2>
            <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-2">
              <p>
                Plugg uses reasonable care to operate the service but cannot promise uninterrupted or error-free playback. To the extent permitted by law, Plugg is not responsible for losses beyond its reasonable control. No provision limits rights or remedies that cannot legally be excluded.
              </p>
              <p>
                These Terms are governed by applicable Ugandan law, including copyright and data protection requirements. For help, complaints or disputes, contact support@plugg.site. Parties may use courts or appropriate authorities with jurisdiction where necessary.
              </p>
            </div>
          </section>

          {/* 15 */}
          <section className="pt-8 space-y-3">
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-baseline gap-2">
              <span className="text-primary font-mono text-sm sm:text-base">15.</span>
              <span>Contact and policy status</span>
            </h2>
            <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-2">
              <p>
                Platform: Plugg | Operator: Atedo (Pirwoth Samuel) | Location: Pakwach, Uganda | Website: www.plugg.site | Email: support@plugg.site.
              </p>
              <p>
                Version dated 22 October 2026. These Terms take effect when first published on the Plugg website.
              </p>
            </div>
          </section>
        </div>

        {/* References & Document Download Box */}
        <div className="pt-8 border-t border-border/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground">Statutory References & Authorities:</p>
            <p>
              Applicable laws of Uganda · Electronic Signatures Act · Electronic Transactions Act · Copyright & Neighbouring Rights Act, Cap. 222
            </p>
          </div>
          <a
            href="/documents/Plugg_Terms_and_Conditions.pdf"
            download="Plugg_Terms_and_Conditions.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted/40 transition-colors shadow-sm"
          >
            <Download className="h-4 w-4 text-primary" />
            <span>Official Terms PDF</span>
          </a>
        </div>
      </main>
    </div>
  );
}
