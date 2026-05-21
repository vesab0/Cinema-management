export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-black text-white px-4 py-20">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-4xl font-black uppercase text-white mb-2">Terms of Service</h1>
        <p className="text-white/40 text-sm mb-12">Last updated: January 1, 2025</p>

        <div className="flex flex-col gap-10 text-white/70 leading-relaxed">
          <section>
            <h2 className="text-white font-semibold text-lg mb-3">1. Acceptance of Terms</h2>
            <p>By accessing or using the Twin Peaks Cinema website, you agree to be bound by these Terms of Service. If you do not agree, please do not use our services.</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-lg mb-3">2. Ticket Purchases</h2>
            <p>All ticket sales are final. Refunds are only available if a screening is cancelled by Twin Peaks Cinema. In the event of a cancellation, you will be notified by email and a full refund will be issued within 5–7 business days.</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-lg mb-3">3. User Accounts</h2>
            <p>You are responsible for maintaining the confidentiality of your account credentials. Any activity that occurs under your account is your responsibility. Please notify us immediately if you suspect unauthorized access.</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-lg mb-3">4. Conduct</h2>
            <p>You agree not to use the site for any unlawful purpose or in any way that could damage, disable, or impair the service. We reserve the right to suspend or terminate accounts that violate these terms.</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-lg mb-3">5. Changes to Terms</h2>
            <p>We may update these terms from time to time. Continued use of the site after changes are posted constitutes your acceptance of the new terms.</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-lg mb-3">6. Contact</h2>
            <p>For questions about these terms, reach us at <a href="mailto:twinpeaks@cinema.com" className="text-yellow-400 hover:underline">twinpeaks@cinema.com</a>.</p>
          </section>
        </div>
      </div>
    </div>
  )
}