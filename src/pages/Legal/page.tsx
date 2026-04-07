import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'

type LegalPageProps = {
  title: string
  updatedAt: string
  children: React.ReactNode
}

function LegalShell({ title, updatedAt, children }: LegalPageProps) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 px-6 py-10">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Vocalochart</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-2 text-sm text-slate-400">Last updated {updatedAt}</p>
          </div>
          <Link className="text-sm text-slate-300 underline underline-offset-4 hover:text-white" to="/">
            Back to homepage
          </Link>
        </div>

        <Card className="border-slate-800 bg-slate-900/70 shadow-xl">
          <CardContent className="space-y-6 px-6 py-6 text-sm leading-7 text-slate-200 sm:px-8 sm:py-8">
            {children}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold text-white">{title}</h2>
      <div className="space-y-3 text-slate-300">{children}</div>
    </section>
  )
}

export function PrivacyPolicyPage() {
  return (
    <LegalShell title="Privacy Policy" updatedAt="April 7, 2026">
      <Section title="Overview">
        <p>
          Vocalochart is an internal-use application used to review YouTube playlist and chart data for
          operational workflows. This page exists to describe how the app handles Google account data for
          verification and branding purposes.
        </p>
      </Section>

      <Section title="Information we access">
        <p>
          When an authorized internal user signs in with Google, Vocalochart may access basic Google account
          profile information and YouTube data needed to read, manage, and sync playlists connected to that
          user account.
        </p>
      </Section>

      <Section title="How we use data">
        <p>
          Accessed data is used only to authenticate approved users, retrieve playlist information, and run
          internal chart-sync workflows. Vocalochart is not intended for public consumer use, advertising,
          or resale of user data.
        </p>
      </Section>

      <Section title="Data sharing">
        <p>
          We do not sell Google user data. Data is shared only with service providers or infrastructure
          required to operate the application, and only to the extent necessary to support the internal
          workflow.
        </p>
      </Section>

      <Section title="Data retention and deletion">
        <p>
          Tokens and related account data are retained only as long as needed to support ongoing internal
          access and sync operations. Access can be revoked by removing app authorization from the linked
          Google account or by discontinuing internal use of the application.
        </p>
      </Section>

      <Section title="Security">
        <p>
          We use reasonable technical measures to protect account credentials, OAuth tokens, and synced
          playlist data from unauthorized access. Because this is an internal tool, access is limited to
          approved users and administrators.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          For privacy questions related to Vocalochart, contact the internal application owner or technical
          administrator responsible for this deployment.
        </p>
      </Section>
    </LegalShell>
  )
}

export function TermsOfServicePage() {
  return (
    <LegalShell title="Terms of Service" updatedAt="April 7, 2026">
      <Section title="Scope">
        <p>
          Vocalochart is provided as a restricted internal-use tool for authorized users who manage YouTube
          playlist and chart workflows. It is not a general public application.
        </p>
      </Section>

      <Section title="Authorized use">
        <p>
          You may use Vocalochart only if you have been granted permission by the organization operating the
          app. You agree to use the app solely for legitimate internal business or editorial purposes.
        </p>
      </Section>

      <Section title="Google account access">
        <p>
          By signing in with Google, you authorize Vocalochart to access the Google and YouTube data needed
          to authenticate you and perform the playlist actions supported by the app. You remain responsible
          for using accounts and connected content in compliance with Google policies and your organization’s
          internal rules.
        </p>
      </Section>

      <Section title="Restrictions">
        <p>
          You must not use the app to violate platform policies, interfere with service operation, attempt
          unauthorized access, or process data outside the intended internal workflow.
        </p>
      </Section>

      <Section title="Availability">
        <p>
          The app is provided on an as-is, internal basis and may be updated, limited, or removed at any
          time. Features may change without notice as operational needs change.
        </p>
      </Section>

      <Section title="Termination">
        <p>
          Access may be suspended or revoked at any time if a user is no longer authorized or if use of the
          application creates operational, security, or compliance concerns.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions about these terms should be directed to the internal application owner or the team
          maintaining this deployment.
        </p>
      </Section>
    </LegalShell>
  )
}