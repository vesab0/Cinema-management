export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-black text-white px-4 py-20">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-4xl font-black uppercase text-white mb-2">Privacy Policy</h1>
        <p className="text-white/40 text-sm mb-12">Last updated: January 1, 2025</p>

        <div className="flex flex-col gap-10 text-white/70 leading-relaxed">
          <section>
            <h2 className="text-white font-semibold text-lg mb-3">1. Information We Collect</h2>
            <p>We collect information you provide when creating an account, purchasing tickets, or contacting us. This includes your name, email address, phone number, and payment information. We also collect usage data such as pages visited and actions taken on the site.</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-lg mb-3">2. How We Use Your Information</h2>
            <p>We use your information to process ticket purchases, send booking confirmations, improve our services, and communicate with you about upcoming screenings and offers. We do not sell your personal data to third parties.</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-lg mb-3">3. Cookies</h2>
            <p>We use cookies to keep you logged in and to understand how visitors use our site. You can disable cookies in your browser settings, though some parts of the site may not function properly as a result.</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-lg mb-3">4. Data Retention</h2>
            <p>We retain your personal data for as long as your account is active or as needed to provide services. You may request deletion of your account and associated data at any time by contacting us.</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-lg mb-3">5. Contact</h2>
            <p>If you have questions about this policy, contact us at <a href="mailto:twinpeaks@cinema.com" className="text-yellow-400 hover:underline">twinpeaks@cinema.com</a>.</p>
          </section>
        </div>
      </div>
    </div>
  )
}