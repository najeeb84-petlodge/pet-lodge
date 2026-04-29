import { Link } from 'react-router-dom'

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen" style={{ background: '#f8f9f6' }}>
      <div className="max-w-3xl mx-auto px-4 py-8">

        <div className="mb-8">
          <img src="/logo.jpg" alt="Pet Lodge" className="h-12 w-auto rounded" />
        </div>

        <h1 className="text-3xl font-bold mb-2" style={{ color: '#2d3a1e' }}>Privacy Policy</h1>
        <p className="text-sm mb-6" style={{ color: '#6b7280' }}>Last updated: 29 April 2026</p>

        <p className="text-sm mb-6 leading-relaxed" style={{ color: '#374151' }}>
          Pet Lodge Kennels &amp; Cattery ("Pet Lodge", "we", "us", "our") operates the Pet Lodge JO booking
          platform at booking.petlodgejo.com. This Privacy Policy explains how we collect, use, and protect
          information about you when you use our services.
        </p>

        <h2 className="text-xl font-bold mt-8 mb-3 pb-2" style={{ color: '#2d3a1e', borderBottom: '1px solid #c6dba0' }}>1. Information We Collect</h2>

        <div className="mb-4">
          <p className="text-sm font-semibold mb-2" style={{ color: '#374151' }}>Information you provide directly:</p>
          <ul className="list-disc pl-5 space-y-1 text-sm" style={{ color: '#374151' }}>
            <li>Account information: name, email address, phone number, WhatsApp number, password</li>
            <li>Pet information: name, species, breed, age, gender, medical conditions, medications, dietary requirements, vaccination records, veterinarian contact details, photos</li>
            <li>Booking information: service dates, requested services, special instructions, emergency contacts</li>
            <li>Payment information: amounts paid, payment method, transaction records (we do not store full credit card numbers)</li>
            <li>Address information: neighbourhood, street, flat number (optional)</li>
            <li>Communications: messages you send us via the platform, email, or WhatsApp</li>
          </ul>
        </div>

        <div className="mb-4">
          <p className="text-sm font-semibold mb-2" style={{ color: '#374151' }}>Information collected automatically:</p>
          <ul className="list-disc pl-5 space-y-1 text-sm" style={{ color: '#374151' }}>
            <li>Log data: IP address, browser type, pages visited, time spent on the platform</li>
            <li>Cookies and similar technologies for authentication and preferences</li>
          </ul>
        </div>

        <div className="mb-6">
          <p className="text-sm font-semibold mb-2" style={{ color: '#374151' }}>Information from third parties:</p>
          <p className="text-sm leading-relaxed" style={{ color: '#374151' }}>
            If you sign in using Google, we receive your name, email address, and profile picture from Google
            as authorized by you. We use this information solely to create and manage your Pet Lodge account.
          </p>
        </div>

        <h2 className="text-xl font-bold mt-8 mb-3 pb-2" style={{ color: '#2d3a1e', borderBottom: '1px solid #c6dba0' }}>2. How We Use Your Information</h2>
        <p className="text-sm mb-2 leading-relaxed" style={{ color: '#374151' }}>We use the information we collect to:</p>
        <ul className="list-disc pl-5 space-y-1 text-sm mb-4" style={{ color: '#374151' }}>
          <li>Provide and manage pet boarding, daycare, grooming, training, and transportation services</li>
          <li>Process bookings, payments, and communications</li>
          <li>Send booking confirmations, receipts, and service updates</li>
          <li>Send daily updates and photos of your pet during their stay (where applicable)</li>
          <li>Improve our services and customer experience</li>
          <li>Comply with legal obligations</li>
          <li>Prevent fraud and protect the security of our platform</li>
        </ul>

        <h2 className="text-xl font-bold mt-8 mb-3 pb-2" style={{ color: '#2d3a1e', borderBottom: '1px solid #c6dba0' }}>3. How We Share Your Information</h2>
        <p className="text-sm mb-3 leading-relaxed" style={{ color: '#374151' }}>We share your information only as necessary to operate our services:</p>
        <ul className="list-disc pl-5 space-y-2 text-sm mb-4" style={{ color: '#374151' }}>
          <li><strong>Service providers</strong>: We use trusted third parties to operate our platform, including Supabase (database hosting), Resend (transactional email delivery), Vercel (web hosting), and Google (sign-in services). These providers process data only on our behalf and under contractual obligations to protect it.</li>
          <li><strong>Veterinary professionals</strong>: In emergencies, we may share relevant pet health information with veterinarians providing emergency care.</li>
          <li><strong>Legal authorities</strong>: We may disclose information if required by Jordanian law, court order, or other legal process.</li>
          <li><strong>Business transfers</strong>: If Pet Lodge is involved in a merger or acquisition, your information may be transferred as part of that transaction.</li>
        </ul>
        <p className="text-sm mb-4" style={{ color: '#374151' }}>We do not sell your personal information to third parties.</p>

        <h2 className="text-xl font-bold mt-8 mb-3 pb-2" style={{ color: '#2d3a1e', borderBottom: '1px solid #c6dba0' }}>4. Cookies and Tracking</h2>
        <p className="text-sm mb-4 leading-relaxed" style={{ color: '#374151' }}>
          We use cookies and similar technologies for authentication and keeping you signed in, remembering
          your preferences, and understanding how our platform is used. You can control cookies through your
          browser settings, though some platform features may not work without them.
        </p>

        <h2 className="text-xl font-bold mt-8 mb-3 pb-2" style={{ color: '#2d3a1e', borderBottom: '1px solid #c6dba0' }}>5. Data Security</h2>
        <p className="text-sm mb-4 leading-relaxed" style={{ color: '#374151' }}>
          We implement appropriate technical and organizational measures to protect your information, including
          encryption of data in transit (HTTPS), secure database storage with role-based access controls (Row
          Level Security), and regular security reviews. No system is completely secure. While we work to
          protect your information, we cannot guarantee absolute security.
        </p>

        <h2 className="text-xl font-bold mt-8 mb-3 pb-2" style={{ color: '#2d3a1e', borderBottom: '1px solid #c6dba0' }}>6. Data Retention</h2>
        <p className="text-sm mb-4 leading-relaxed" style={{ color: '#374151' }}>
          We retain your information for as long as your account is active or as needed to provide services.
          We may retain certain information after account closure to comply with legal obligations, resolve
          disputes, or enforce our agreements.
        </p>

        <h2 className="text-xl font-bold mt-8 mb-3 pb-2" style={{ color: '#2d3a1e', borderBottom: '1px solid #c6dba0' }}>7. Your Rights</h2>
        <p className="text-sm mb-4 leading-relaxed" style={{ color: '#374151' }}>
          You have the right to access the personal information we hold about you, request correction of
          inaccurate information, request deletion of your information (subject to legal retention
          requirements), withdraw consent for optional data uses, and lodge a complaint with applicable
          authorities. To exercise these rights, contact us at the details below.
        </p>

        <h2 className="text-xl font-bold mt-8 mb-3 pb-2" style={{ color: '#2d3a1e', borderBottom: '1px solid #c6dba0' }}>8. Children's Privacy</h2>
        <p className="text-sm mb-4 leading-relaxed" style={{ color: '#374151' }}>
          Pet Lodge services are intended for adults. We do not knowingly collect information from children
          under 16. If you believe a child has provided us with information, please contact us and we will
          delete it.
        </p>

        <h2 className="text-xl font-bold mt-8 mb-3 pb-2" style={{ color: '#2d3a1e', borderBottom: '1px solid #c6dba0' }}>9. International Data Transfers</h2>
        <p className="text-sm mb-4 leading-relaxed" style={{ color: '#374151' }}>
          Some of our service providers may process data outside Jordan. By using our services, you consent
          to these transfers, which are protected by appropriate contractual safeguards.
        </p>

        <h2 className="text-xl font-bold mt-8 mb-3 pb-2" style={{ color: '#2d3a1e', borderBottom: '1px solid #c6dba0' }}>10. Changes to This Policy</h2>
        <p className="text-sm mb-4 leading-relaxed" style={{ color: '#374151' }}>
          We may update this Privacy Policy from time to time. We will notify you of material changes by
          email or through the platform. The "Last updated" date at the top indicates when this policy was
          last revised.
        </p>

        <h2 className="text-xl font-bold mt-8 mb-3 pb-2" style={{ color: '#2d3a1e', borderBottom: '1px solid #c6dba0' }}>11. Contact Us</h2>
        <p className="text-sm mb-3 leading-relaxed" style={{ color: '#374151' }}>
          If you have questions about this Privacy Policy or your personal information, contact us:
        </p>
        <div className="text-sm leading-relaxed space-y-0.5" style={{ color: '#374151' }}>
          <p className="font-semibold">Pet Lodge Kennels &amp; Cattery</p>
          <p>Email: <a href="mailto:booking@petlodgejo.com" style={{ color: '#5a7a2e' }}>booking@petlodgejo.com</a></p>
          <p>Phone: <a href="tel:+96279890647" style={{ color: '#5a7a2e' }}>+962 79 8906476</a></p>
          <p>Website: <a href="https://petlodgejo.com" target="_blank" rel="noopener noreferrer" style={{ color: '#5a7a2e' }}>petlodgejo.com</a></p>
        </div>

        <div className="mt-10 pt-6" style={{ borderTop: '1px solid #c6dba0' }}>
          <Link to="/" className="text-sm font-medium hover:underline" style={{ color: '#5a7a2e' }}>← Back to home</Link>
        </div>

      </div>
    </div>
  )
}
