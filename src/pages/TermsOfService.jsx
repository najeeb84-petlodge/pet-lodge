import { Link } from 'react-router-dom'

export default function TermsOfService() {
  return (
    <div className="min-h-screen" style={{ background: '#f8f9f6' }}>
      <div className="max-w-3xl mx-auto px-4 py-8">

        <div className="mb-8">
          <img src="/logo.jpg" alt="Pet Lodge" className="h-12 w-auto rounded" />
        </div>

        <h1 className="text-3xl font-bold mb-2" style={{ color: '#2d3a1e' }}>Terms of Service</h1>
        <p className="text-sm mb-6" style={{ color: '#6b7280' }}>Last updated: 29 April 2026</p>

        <p className="text-sm mb-6 leading-relaxed" style={{ color: '#374151' }}>
          Please read these Terms of Service carefully before using the Pet Lodge JO booking platform.
          By creating an account or making a booking, you agree to be bound by these terms. If you do
          not agree, please do not use our services.
        </p>

        <h2 className="text-xl font-bold mt-8 mb-3 pb-2" style={{ color: '#2d3a1e', borderBottom: '1px solid #c6dba0' }}>1. About Us</h2>
        <p className="text-sm mb-4 leading-relaxed" style={{ color: '#374151' }}>
          Pet Lodge Kennels &amp; Cattery ("Pet Lodge", "we", "us", "our") operates a pet care facility
          in Amman, Jordan, and the online booking platform at booking.petlodgejo.com. We provide
          boarding, day camp, grooming, training, dog walking, and transportation services for pets.
        </p>

        <h2 className="text-xl font-bold mt-8 mb-3 pb-2" style={{ color: '#2d3a1e', borderBottom: '1px solid #c6dba0' }}>2. Eligibility</h2>
        <p className="text-sm mb-4 leading-relaxed" style={{ color: '#374151' }}>
          You must be at least 18 years old and legally capable of entering into a binding contract
          to use our services. By using the platform, you confirm that you meet these requirements
          and that all information you provide is accurate and complete.
        </p>

        <h2 className="text-xl font-bold mt-8 mb-3 pb-2" style={{ color: '#2d3a1e', borderBottom: '1px solid #c6dba0' }}>3. Bookings and Reservations</h2>
        <ul className="list-disc pl-5 space-y-2 text-sm mb-4" style={{ color: '#374151' }}>
          <li>A booking is confirmed only after you receive a written confirmation from Pet Lodge.</li>
          <li>We reserve the right to decline any booking at our discretion.</li>
          <li>You are responsible for ensuring all pet information provided at booking is accurate, including vaccination status, health conditions, and behaviour.</li>
          <li>Changes to confirmed bookings are subject to availability and must be requested at least 48 hours in advance.</li>
        </ul>

        <h2 className="text-xl font-bold mt-8 mb-3 pb-2" style={{ color: '#2d3a1e', borderBottom: '1px solid #c6dba0' }}>4. Pricing and Payment</h2>
        <ul className="list-disc pl-5 space-y-2 text-sm mb-4" style={{ color: '#374151' }}>
          <li>All prices are listed in Jordanian Dinar (JD) and are inclusive of applicable taxes unless stated otherwise.</li>
          <li>Prices are subject to change. The price confirmed at the time of booking applies to that booking.</li>
          <li>Payment is due at the time of collection or as otherwise agreed in writing.</li>
          <li>We accept cash and bank transfer. Other payment methods may be available at our discretion.</li>
          <li>Outstanding balances must be settled before your pet is released.</li>
        </ul>

        <h2 className="text-xl font-bold mt-8 mb-3 pb-2" style={{ color: '#2d3a1e', borderBottom: '1px solid #c6dba0' }}>5. Cancellations and Refunds</h2>
        <ul className="list-disc pl-5 space-y-2 text-sm mb-4" style={{ color: '#374151' }}>
          <li><strong>More than 48 hours notice:</strong> Full refund or credit for any deposit paid.</li>
          <li><strong>24–48 hours notice:</strong> 50% refund or credit.</li>
          <li><strong>Less than 24 hours notice or no-show:</strong> No refund. Full service fee may apply.</li>
          <li>Cancellations during a stay (early collection) are non-refundable for unused nights.</li>
          <li>Refunds, where applicable, are processed within 7 business days by the original payment method.</li>
        </ul>

        <h2 className="text-xl font-bold mt-8 mb-3 pb-2" style={{ color: '#2d3a1e', borderBottom: '1px solid #c6dba0' }}>6. Vaccination and Health Requirements</h2>
        <p className="text-sm mb-3 leading-relaxed" style={{ color: '#374151' }}>
          For the safety of all animals in our care, we require:
        </p>
        <ul className="list-disc pl-5 space-y-2 text-sm mb-4" style={{ color: '#374151' }}>
          <li><strong>Dogs:</strong> Valid vaccinations for rabies, distemper, parvovirus, and kennel cough (bordetella). Flea and tick treatment within the past 30 days.</li>
          <li><strong>Cats:</strong> Valid vaccinations for rabies and feline calicivirus/herpesvirus. Flea treatment within the past 30 days.</li>
          <li>We reserve the right to refuse or discharge any animal showing signs of illness, aggression, or infestation. In such cases, our standard cancellation policy applies.</li>
          <li>You must disclose all known health conditions, medications, and behavioural traits at the time of booking. Failure to do so may result in refusal of service without refund.</li>
        </ul>

        <h2 className="text-xl font-bold mt-8 mb-3 pb-2" style={{ color: '#2d3a1e', borderBottom: '1px solid #c6dba0' }}>7. Drop-off and Collection</h2>
        <ul className="list-disc pl-5 space-y-2 text-sm mb-4" style={{ color: '#374151' }}>
          <li>Drop-off and collection must occur during our published operating hours.</li>
          <li>Late collection beyond our closing time may incur an additional overnight charge.</li>
          <li>If you arrange transportation through Pet Lodge, you are responsible for ensuring a responsible adult is available at the pickup and drop-off address.</li>
          <li>We will not leave an animal unattended at a property without an adult present.</li>
        </ul>

        <h2 className="text-xl font-bold mt-8 mb-3 pb-2" style={{ color: '#2d3a1e', borderBottom: '1px solid #c6dba0' }}>8. Care and Welfare</h2>
        <p className="text-sm mb-3 leading-relaxed" style={{ color: '#374151' }}>
          While your pet is in our care:
        </p>
        <ul className="list-disc pl-5 space-y-2 text-sm mb-4" style={{ color: '#374151' }}>
          <li>We will provide food, water, shelter, exercise, and attention appropriate to each animal.</li>
          <li>We will follow any specific dietary or medication instructions you provide, subject to our ability to safely administer them.</li>
          <li>We may photograph or video your pet and share content on our social media channels. If you object, please notify us in writing before the booking begins.</li>
          <li>We reserve the right to seek emergency veterinary care for your pet if we believe it is necessary to protect the animal's welfare. You are responsible for all resulting veterinary costs.</li>
        </ul>

        <h2 className="text-xl font-bold mt-8 mb-3 pb-2" style={{ color: '#2d3a1e', borderBottom: '1px solid #c6dba0' }}>9. Veterinary Emergencies</h2>
        <p className="text-sm mb-4 leading-relaxed" style={{ color: '#374151' }}>
          In a medical emergency, we will attempt to contact you using the information provided at
          booking. If we cannot reach you, we will proceed with emergency veterinary care as needed
          and notify you as soon as possible. You authorise Pet Lodge to make decisions necessary to
          protect your pet's life in your absence. You agree to reimburse all emergency veterinary
          costs incurred on your behalf.
        </p>

        <h2 className="text-xl font-bold mt-8 mb-3 pb-2" style={{ color: '#2d3a1e', borderBottom: '1px solid #c6dba0' }}>10. Liability and Indemnity</h2>
        <ul className="list-disc pl-5 space-y-2 text-sm mb-4" style={{ color: '#374151' }}>
          <li>Pet Lodge takes reasonable care of all animals entrusted to us. However, we are not liable for illness, injury, death, or loss of an animal arising from pre-existing conditions, undisclosed health issues, or circumstances beyond our reasonable control.</li>
          <li>You indemnify Pet Lodge against any claims, costs, or damages arising from injury or damage caused by your pet to our staff, property, or other animals in our care.</li>
          <li>Our total liability for any claim shall not exceed the amount paid for the relevant booking.</li>
          <li>Nothing in these terms limits liability for death or personal injury caused by our negligence.</li>
        </ul>

        <h2 className="text-xl font-bold mt-8 mb-3 pb-2" style={{ color: '#2d3a1e', borderBottom: '1px solid #c6dba0' }}>11. Grooming Services</h2>
        <ul className="list-disc pl-5 space-y-2 text-sm mb-4" style={{ color: '#374151' }}>
          <li>Grooming is performed by trained staff using industry-standard equipment.</li>
          <li>We will take reasonable care during grooming; however, we are not liable for pre-existing skin conditions, matting that requires shaving, or stress reactions in animals unaccustomed to grooming.</li>
          <li>Severely matted coats may require additional time and cost. We will notify you before proceeding.</li>
          <li>We reserve the right to stop a grooming session if the animal is showing severe stress or aggression that puts staff or the animal at risk.</li>
        </ul>

        <h2 className="text-xl font-bold mt-8 mb-3 pb-2" style={{ color: '#2d3a1e', borderBottom: '1px solid #c6dba0' }}>12. Training Services</h2>
        <ul className="list-disc pl-5 space-y-2 text-sm mb-4" style={{ color: '#374151' }}>
          <li>Training outcomes depend on many factors including the animal's temperament, age, and consistency of practice at home. We do not guarantee specific training results.</li>
          <li>A free assessment is included before training sessions begin. Our trainers will advise on the appropriate number and type of sessions following the assessment.</li>
          <li>Session bundles are non-refundable once training has commenced.</li>
        </ul>

        <h2 className="text-xl font-bold mt-8 mb-3 pb-2" style={{ color: '#2d3a1e', borderBottom: '1px solid #c6dba0' }}>13. Transportation Services</h2>
        <ul className="list-disc pl-5 space-y-2 text-sm mb-4" style={{ color: '#374151' }}>
          <li>Transportation is provided within Amman and surrounding areas. Specific coverage zones are confirmed at the time of booking.</li>
          <li>Animals must be in good health and fit for transport. We will not transport animals showing signs of acute illness.</li>
          <li>We are not liable for delays caused by traffic or other circumstances outside our control.</li>
        </ul>

        <h2 className="text-xl font-bold mt-8 mb-3 pb-2" style={{ color: '#2d3a1e', borderBottom: '1px solid #c6dba0' }}>14. Your Account</h2>
        <ul className="list-disc pl-5 space-y-2 text-sm mb-4" style={{ color: '#374151' }}>
          <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
          <li>You must notify us immediately if you suspect unauthorised access to your account.</li>
          <li>We may suspend or terminate your account if we believe it has been compromised or used in violation of these terms.</li>
          <li>You may request deletion of your account at any time by contacting us. Account deletion is subject to our data retention obligations.</li>
        </ul>

        <h2 className="text-xl font-bold mt-8 mb-3 pb-2" style={{ color: '#2d3a1e', borderBottom: '1px solid #c6dba0' }}>15. Acceptable Use</h2>
        <p className="text-sm mb-3 leading-relaxed" style={{ color: '#374151' }}>You agree not to:</p>
        <ul className="list-disc pl-5 space-y-1 text-sm mb-4" style={{ color: '#374151' }}>
          <li>Use the platform for any unlawful purpose</li>
          <li>Submit false, misleading, or fraudulent information</li>
          <li>Attempt to gain unauthorised access to any part of the platform</li>
          <li>Interfere with the operation of the platform or other users' access</li>
          <li>Scrape, copy, or redistribute content without our written consent</li>
        </ul>

        <h2 className="text-xl font-bold mt-8 mb-3 pb-2" style={{ color: '#2d3a1e', borderBottom: '1px solid #c6dba0' }}>16. Intellectual Property</h2>
        <p className="text-sm mb-4 leading-relaxed" style={{ color: '#374151' }}>
          All content on the Pet Lodge platform, including text, images, logos, and software, is the
          property of Pet Lodge Kennels &amp; Cattery or its licensors and is protected by applicable
          intellectual property laws. You may not reproduce, distribute, or create derivative works
          from our content without prior written permission.
        </p>

        <h2 className="text-xl font-bold mt-8 mb-3 pb-2" style={{ color: '#2d3a1e', borderBottom: '1px solid #c6dba0' }}>17. Changes to These Terms</h2>
        <p className="text-sm mb-4 leading-relaxed" style={{ color: '#374151' }}>
          We may update these Terms of Service from time to time. We will notify you of material
          changes by email or through the platform. Continued use of our services after changes are
          published constitutes acceptance of the revised terms. The "Last updated" date at the top
          indicates when these terms were last revised.
        </p>

        <h2 className="text-xl font-bold mt-8 mb-3 pb-2" style={{ color: '#2d3a1e', borderBottom: '1px solid #c6dba0' }}>18. Governing Law and Disputes</h2>
        <p className="text-sm mb-4 leading-relaxed" style={{ color: '#374151' }}>
          These terms are governed by the laws of the Hashemite Kingdom of Jordan. Any dispute
          arising from or relating to these terms or our services shall first be addressed through
          good-faith negotiation. If unresolved, disputes shall be subject to the exclusive
          jurisdiction of the courts of Amman, Jordan.
        </p>

        <h2 className="text-xl font-bold mt-8 mb-3 pb-2" style={{ color: '#2d3a1e', borderBottom: '1px solid #c6dba0' }}>Contact Us</h2>
        <p className="text-sm mb-3 leading-relaxed" style={{ color: '#374151' }}>
          For questions about these Terms of Service, contact us:
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
