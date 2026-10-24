import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, ArrowLeft, ShieldCheck, AlertCircle, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
});

function PrivacyPage() {
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
              href="/documents/Plugg_Privacy_Policy.pdf"
              download="Plugg_Privacy_Policy.pdf"
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
            <span>Data Protection · Uganda PDPO & Global</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Privacy Policy
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            How Plugg handles personal information and music activity. Covers cloud infrastructure, private Listener data, public Artist profiles, cross-border storage, and data retention limits.
          </p>

          {/* Metadata Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
            <div className="surface-card p-3.5 rounded-xl border border-border/60">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Data Controller</p>
              <p className="text-xs font-semibold text-foreground mt-0.5">Atedo (Pirwoth Samuel)</p>
              <p className="text-[11px] text-muted-foreground">Pakwach, Uganda</p>
            </div>
            <div className="surface-card p-3.5 rounded-xl border border-border/60">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Platform</p>
              <p className="text-xs font-semibold text-foreground mt-0.5">Plugg Music Streaming</p>
              <a href="https://www.plugg.site" className="text-[11px] text-primary hover:underline">www.plugg.site</a>
            </div>
            <div className="surface-card p-3.5 rounded-xl border border-border/60">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Privacy Office</p>
              <p className="text-xs font-semibold text-foreground mt-0.5">support@plugg.site</p>
              <p className="text-[11px] text-muted-foreground">Subject: Data Privacy</p>
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
            This notice applies to Guests, registered Listeners, and registered Artists who use www.plugg.site. It operates in conjunction with our{" "}
            <a href="/terms" className="text-primary hover:underline font-medium">Terms & Conditions</a>
            {" "}and{" "}
            <a href="/copyright" className="text-primary hover:underline font-medium">Copyright Policy</a>.
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-8 divide-y divide-border/40">
          {/* 01 */}
          <section className="pt-8 first:pt-0 space-y-3">
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-baseline gap-2">
              <span className="text-primary font-mono text-sm sm:text-base">01.</span>
              <span>Controller and scope of this policy</span>
            </h2>
            <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-2">
              <p>
                Plugg is operated by Atedo (Pirwoth Samuel) in Pakwach, Uganda. For inquiries about personal data, contact support@plugg.site. This notice applies to Guests, registered Listeners and registered Artists who use www.plugg.site.
              </p>
              <p>
                This notice describes the data expected to be processed for Plugg&apos;s launch features, as described by its operator. Operations and third-party service settings must match this notice before it is published.
              </p>
            </div>
          </section>

          {/* 02 */}
          <section className="pt-8 space-y-3">
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-baseline gap-2">
              <span className="text-primary font-mono text-sm sm:text-base">02.</span>
              <span>Information collected from Guests</span>
            </h2>
            <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-2">
              <p>
                A Guest can search, browse and stream without providing a name or registering. Operating the site may produce technical information including IP address, browser and device details, approximate network location, page requests, playback/session events, errors and security signals.
              </p>
              <p>
                Guest data is used to deliver streams, maintain service reliability, prevent abuse and troubleshoot faults. Plugg does not create a public Guest profile or require an email address merely to play available music.
              </p>
            </div>
          </section>

          {/* 03 */}
          <section className="pt-8 space-y-3">
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-baseline gap-2">
              <span className="text-primary font-mono text-sm sm:text-base">03.</span>
              <span>Information collected from Listeners</span>
            </h2>
            <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-2">
              <p>
                Listener account data may include display name, email address, account role, age-eligibility confirmation, secure login credentials or password hashes, account settings, playlists, likes, followed artists, saved items and listening history.
              </p>
              <p>
                Listener profiles are private to their owners. Plugg does not make Listener profile pages publicly discoverable. Other people do not receive access to a Listener&apos;s personal listening history merely because they are artists or other account holders.
              </p>
            </div>
          </section>

          {/* 04 */}
          <section className="pt-8 space-y-3">
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-baseline gap-2">
              <span className="text-primary font-mono text-sm sm:text-base">04.</span>
              <span>Information collected from Artists</span>
            </h2>
            <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-2">
              <p>
                Artist accounts may provide the account holder&apos;s name, stage or public artist name, country, genre, biography, images, links, music files, release details, performer and contributor credits, and rights declarations or supporting documentation when necessary.
              </p>
              <p>
                Artist name, public biography, profile imagery, music and release information are intended to be visible publicly. Identity or licensing evidence, email address and account security information are not displayed as ordinary public profile content.
              </p>
              <p>
                Creators such as DJs and producers may have public profiles if those roles are introduced later. Future manager profiles, if offered, are intended to remain non-public.
              </p>
            </div>
          </section>

          {/* 05 */}
          <section className="pt-8 space-y-3">
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-baseline gap-2">
              <span className="text-primary font-mono text-sm sm:text-base">05.</span>
              <span>Purposes of data use</span>
            </h2>
            <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-2">
              <p>
                Plugg uses information as necessary to create and secure accounts, stream music, save Listener choices, provide Artist Dashboard tools, display public artist information, address rights complaints, investigate abuse, maintain uptime and respond to support requests.
              </p>
              <p>
                Engagement events may be counted or summarized to provide trending sections and aggregate artist metrics. Where recommendations are supported, Plugg may use saved preferences and listening activity to tailor music discovery. We do not publish individual Listener histories to artist dashboards.
              </p>
            </div>
          </section>

          {/* 06 */}
          <section className="pt-8 space-y-3">
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-baseline gap-2">
              <span className="text-primary font-mono text-sm sm:text-base">06.</span>
              <span>Legal grounds and user choices</span>
            </h2>
            <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-2">
              <p>
                Where required by Ugandan law, Plugg relies on an appropriate basis for processing, including valid consent, provision of a requested service, compliance with legal obligations or other authorized grounds. We will request consent when it is necessary and allow withdrawal where the law provides for it.
              </p>
              <p>
                Users may manage supported account and privacy settings and can seek access, correction or deletion as outlined below. Some technical records and security processing may be necessary to operate the service or meet legal obligations.
              </p>
            </div>
          </section>

          {/* 07 */}
          <section className="pt-8 space-y-3">
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-baseline gap-2">
              <span className="text-primary font-mono text-sm sm:text-base">07.</span>
              <span>Cookies, authentication and tracking</span>
            </h2>
            <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-2">
              <p>
                Plugg does not currently plan independent advertising trackers, third-party behavioral analytics or promotional-email campaigns at launch. Essential authentication, session and security technologies may still be used by the site and its infrastructure providers, including Cloudflare.
              </p>
              <p>
                Cookies or similar technologies may support sign-in, site security and playback continuity. If Plugg introduces non-essential analytics, advertising or promotional tracking, it will update this notice and obtain any consent required before the new processing starts.
              </p>
            </div>
          </section>

          {/* 08 */}
          <section className="pt-8 space-y-3">
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-baseline gap-2">
              <span className="text-primary font-mono text-sm sm:text-base">08.</span>
              <span>Service providers and disclosure</span>
            </h2>
            <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-2">
              <p>
                Plugg currently uses Cloudflare for website infrastructure and Neon for database services. These providers may process technical or account data as needed to deliver their services, subject to appropriate contractual and security controls.
              </p>
              <p>
                Plugg does not currently sell users&apos; personal information or provide it to advertisers. It may disclose information to authorized personnel, service providers or competent authorities when lawful and necessary.
              </p>
            </div>
          </section>

          {/* 09 */}
          <section className="pt-8 space-y-3">
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-baseline gap-2">
              <span className="text-primary font-mono text-sm sm:text-base">09.</span>
              <span>Where data is processed and stored</span>
            </h2>
            <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-2">
              <p>
                Primary database: Neon infrastructure in Frankfurt, Germany (AWS region eu-central-1). Local backups: copies synchronized to a server in Pakwach, Uganda, as described by the platform operator.
              </p>
              <p>
                Cloudflare and other necessary network infrastructure may handle requests or security information in additional locations. Because primary account data is stored outside Uganda, Plugg satisfies Uganda&apos;s applicable cross-border processing and safeguarding requirements.
              </p>
            </div>
          </section>

          {/* 10 */}
          <section className="pt-8 space-y-3">
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-baseline gap-2">
              <span className="text-primary font-mono text-sm sm:text-base">10.</span>
              <span>Data security and access</span>
            </h2>
            <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-2">
              <p>
                Plugg uses HTTPS connections, password hashing, role-based access controls, limited staff access, security monitoring and protected backups. Private Listener data, authentication secrets, rights records and operational logs should only be accessible to authorized personnel for legitimate purposes.
              </p>
            </div>
          </section>

          {/* 11 - Table */}
          <section className="pt-8 space-y-4">
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-baseline gap-2">
              <span className="text-primary font-mono text-sm sm:text-base">11.</span>
              <span>Recommended data-retention schedule</span>
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              The following is Plugg&apos;s launch retention schedule. At the end of a retention period, information is securely deleted or de-identified where reasonably practicable:
            </p>

            <div className="overflow-x-auto rounded-xl border border-border/80">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-foreground font-semibold border-b border-border/80">
                  <tr>
                    <th className="p-3 sm:p-4 min-w-[200px]">Record category</th>
                    <th className="p-3 sm:p-4 min-w-[300px]">Retention Schedule</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 text-muted-foreground">
                  <tr className="hover:bg-muted/10 transition-colors">
                    <td className="p-3 sm:p-4 font-medium text-foreground">Account profile and settings</td>
                    <td className="p-3 sm:p-4 leading-relaxed">While the account exists; erased or anonymized within 30 days after a valid deletion request.</td>
                  </tr>
                  <tr className="hover:bg-muted/10 transition-colors">
                    <td className="p-3 sm:p-4 font-medium text-foreground">Listening history & identifiable events</td>
                    <td className="p-3 sm:p-4 leading-relaxed">Rolling 12 months from the event, unless deleted earlier or needed for lawful purposes.</td>
                  </tr>
                  <tr className="hover:bg-muted/10 transition-colors">
                    <td className="p-3 sm:p-4 font-medium text-foreground">Routine security and access logs</td>
                    <td className="p-3 sm:p-4 leading-relaxed">Up to 90 days, unless a security investigation requires longer retention.</td>
                  </tr>
                  <tr className="hover:bg-muted/10 transition-colors">
                    <td className="p-3 sm:p-4 font-medium text-foreground">Support requests & correspondence</td>
                    <td className="p-3 sm:p-4 leading-relaxed">Up to 24 months after the case closes, unless a dispute requires longer.</td>
                  </tr>
                  <tr className="hover:bg-muted/10 transition-colors">
                    <td className="p-3 sm:p-4 font-medium text-foreground">Artist licence and dispute records</td>
                    <td className="p-3 sm:p-4 leading-relaxed">Up to 7 years after the related agreement or matter ends, subject to legal requirements.</td>
                  </tr>
                  <tr className="hover:bg-muted/10 transition-colors">
                    <td className="p-3 sm:p-4 font-medium text-foreground">Routine backup copies</td>
                    <td className="p-3 sm:p-4 leading-relaxed">Rotated and deleted within 90 days in normal operation.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* 12 */}
          <section className="pt-8 space-y-3">
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-baseline gap-2">
              <span className="text-primary font-mono text-sm sm:text-base">12.</span>
              <span>Your rights and account deletion</span>
            </h2>
            <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-2">
              <p>
                Subject to Ugandan law, individuals may request access to, correction of or deletion of their data, object to certain processing, or withdraw consent where applicable. To exercise these rights, use the available account settings or write to support@plugg.site.
              </p>
              <p>
                Users who cannot resolve a complaint directly may contact Uganda&apos;s Personal Data Protection Office (PDPO) at{" "}
                <a href="https://pdpo.go.ug" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-semibold inline-flex items-center gap-0.5">
                  pdpo.go.ug <ExternalLink className="h-3 w-3" />
                </a>.
              </p>
            </div>
          </section>

          {/* 13 */}
          <section className="pt-8 space-y-3">
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-baseline gap-2">
              <span className="text-primary font-mono text-sm sm:text-base">13.</span>
              <span>Age restrictions</span>
            </h2>
            <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-2">
              <p>
                Plugg is intended for people aged 18 years or older. It does not knowingly offer accounts to minors. If an underage account is identified, Plugg may restrict it and handle its information according to applicable law.
              </p>
            </div>
          </section>

          {/* 14 */}
          <section className="pt-8 space-y-3">
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-baseline gap-2">
              <span className="text-primary font-mono text-sm sm:text-base">14.</span>
              <span>Messages, external links and future services</span>
            </h2>
            <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-2">
              <p>
                Plugg may send operational or security-related emails necessary for an account, release or service issue. It does not currently plan promotional-email campaigns at launch. Public artist profiles may link to external websites or social pages controlled by other businesses. Plugg does not control those services&apos; separate privacy practices.
              </p>
            </div>
          </section>

          {/* 15 */}
          <section className="pt-8 space-y-3">
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-baseline gap-2">
              <span className="text-primary font-mono text-sm sm:text-base">15.</span>
              <span>Policy updates and contact</span>
            </h2>
            <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-2">
              <p>
                Platform: Plugg | Operator: Atedo (Pirwoth Samuel) | Location: Pakwach, Uganda | Website: www.plugg.site | Email: support@plugg.site.
              </p>
              <p>
                This document is dated 22 October 2026 and becomes effective when published on www.plugg.site.
              </p>
            </div>
          </section>
        </div>

        {/* References & Document Download Box */}
        <div className="pt-8 border-t border-border/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground">Statutory References & Authorities:</p>
            <p>
              Uganda Data Protection and Privacy Act, 2019 · Personal Data Protection Office (PDPO):{" "}
              <a href="https://pdpo.go.ug" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">
                pdpo.go.ug <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </div>
          <a
            href="/documents/Plugg_Privacy_Policy.pdf"
            download="Plugg_Privacy_Policy.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted/40 transition-colors shadow-sm"
          >
            <Download className="h-4 w-4 text-primary" />
            <span>Official Privacy PDF</span>
          </a>
        </div>
      </main>
    </div>
  );
}
