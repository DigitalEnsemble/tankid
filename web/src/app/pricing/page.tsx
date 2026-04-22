import Link from 'next/link';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

export default function PricingPage() {
  return (
    <div className="min-h-screen">
      <Navigation />

      {/* Hero Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
              TankID Pricing
            </h1>
            <p className="text-lg sm:text-xl text-gray-700 mb-8">
              Phased pricing that grows with our product. Pay for what's built today, not promises.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
              <p className="text-blue-800 font-semibold mb-2">🎯 Pricing Promise</p>
              <p className="text-blue-700 text-sm sm:text-base">
                Our pricing reflects exactly what's available today. As we ship new features,
                pricing increases — but you'll know exactly when and why. No surprises.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Tiers */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-5xl mx-auto">

            {/* Current Phase Indicators */}
            <div className="text-center mb-12">
              <div className="inline-flex bg-gray-100 rounded-lg p-1 mb-6">
                <span className="bg-white text-black px-3 py-1 rounded text-sm font-bold">
                  Phase 0: Beta (Current)
                </span>
                <span className="text-gray-600 px-3 py-1 rounded text-sm">
                  Phase 1: Early Adopter (Month 3)
                </span>
                <span className="text-gray-600 px-3 py-1 rounded text-sm">
                  Phase 2: Growth (Month 9)
                </span>
                <span className="text-gray-600 px-3 py-1 rounded text-sm">
                  Phase 3: Standard (Month 18)
                </span>
              </div>
            </div>

            <div className="grid lg:grid-cols-3 md:grid-cols-3 sm:grid-cols-1 gap-6">

              {/* Beta Tier */}
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 relative">
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                    CURRENT
                  </span>
                </div>
                <div className="text-center mb-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Beta</h3>
                  <div className="text-3xl font-bold text-green-600 mb-2">FREE</div>
                  <p className="text-xs text-gray-600">Forever • Hand-selected customers</p>
                  <p className="text-xs text-gray-600">10-15 facilities max</p>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-start">
                    <span className="text-green-500 mr-2 text-xs">✓</span>
                    <span className="text-xs text-gray-700">QR scan → tank profile (&lt;30 sec)</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-green-500 mr-2 text-xs">✓</span>
                    <span className="text-xs text-gray-700">Tank chart & ATG config</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-green-500 mr-2 text-xs">✓</span>
                    <span className="text-xs text-gray-700">Installation specs display</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-green-500 mr-2 text-xs">✓</span>
                    <span className="text-xs text-gray-700">Mobile browser (no app)</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-green-500 mr-2 text-xs">✓</span>
                    <span className="text-xs text-gray-700 font-semibold">QR labels: FREE (absorbed)</span>
                  </div>
                </div>

                <div className="text-center">
                  <span className="text-xs text-green-600 font-semibold">Beta Only</span>
                </div>
              </div>

              {/* Early Adopter Tier */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 relative">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Early Adopter</h3>
                  <div className="text-3xl font-bold text-blue-600 mb-2">$19</div>
                  <p className="text-xs text-gray-600">/month • up to 5 tanks</p>
                  <p className="text-xs text-gray-600">First 100 paying facilities</p>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-start">
                    <span className="text-blue-500 mr-2 text-xs">✓</span>
                    <span className="text-xs text-gray-700">Everything in Beta</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-blue-500 mr-2 text-xs">✓</span>
                    <span className="text-xs text-gray-700">Basic document upload (5 docs/tank)</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-blue-500 mr-2 text-xs">✓</span>
                    <span className="text-xs text-gray-700">Compliance date tracking (view only)</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-blue-500 mr-2 text-xs">✓</span>
                    <span className="text-xs text-gray-700">Email reminders (30/60/90 day)</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-blue-500 mr-2 text-xs">✓</span>
                    <span className="text-xs text-gray-700 font-semibold">3 QR labels included</span>
                  </div>
                </div>

                <div className="text-center">
                  <Link
                    href="/get-access"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-semibold transition-colors inline-block"
                  >
                    Join Early Access
                  </Link>
                  <p className="text-xs text-blue-600 mt-2 font-semibold">12-month rate lock guarantee</p>
                </div>
              </div>

              {/* Standard Tier */}
              <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Standard</h3>
                  <div className="text-3xl font-bold text-purple-600 mb-2">$49</div>
                  <p className="text-xs text-gray-600">/month • up to 10 tanks</p>
                  <p className="text-xs text-gray-600">Full-feature, full-price tier</p>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-start">
                    <span className="text-purple-500 mr-2 text-xs">✓</span>
                    <span className="text-xs text-gray-700">Everything in Early Adopter</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-purple-500 mr-2 text-xs">✓</span>
                    <span className="text-xs text-gray-700">Compliance cert drafts (PDF auto-generated)</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-purple-500 mr-2 text-xs">✓</span>
                    <span className="text-xs text-gray-700">Multi-user access (5 seats)</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-purple-500 mr-2 text-xs">✓</span>
                    <span className="text-xs text-gray-700">Priority support</span>
                  </div>
                </div>

                <div className="text-center">
                  <span className="text-xs text-gray-500">Available Month 18</span>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* Initial Setup */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8 text-center">
              Initial Setup
            </h2>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h3 className="font-bold text-green-800 mb-3">Beta Phase</h3>
                <p className="text-green-700 text-sm mb-3">
                  <strong>FREE labels</strong> — we absorb the ~$5/facility cost
                </p>
                <p className="text-green-600 text-xs">
                  Up to 15 beta facilities. Maximum exposure: $75 total.
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="font-bold text-blue-800 mb-3">Early Adopter</h3>
                <p className="text-blue-700 text-sm mb-3">
                  <strong>3 labels included</strong> in your subscription
                </p>
                <p className="text-blue-600 text-xs">
                  Additional labels available at cost ($5 each).
                </p>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                <h3 className="font-bold text-orange-800 mb-3">Standard</h3>
                <p className="text-orange-700 text-sm mb-3">
                  <strong>Labels billed at cost</strong> — no markup
                </p>
                <p className="text-orange-600 text-xs">
                  QR labels: $5 each including shipping.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8 text-center">
              Pricing FAQ
            </h2>

            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-6 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-3">Why start so low at $19/month?</h3>
                <p className="text-gray-700 text-sm">
                  Because the product isn't fully built yet. Charging $49+ before service call logging,
                  compliance certificates, and a native app exist would be pricing a promise, not a product.
                  Beta customers are doing us a favor — they deserve a fair price.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-3">When will pricing increase?</h3>
                <p className="text-gray-700 text-sm">
                  Pricing advances as the product advances. Phase 1 ($19) starts Month 3.
                  Phase 2 ($49) starts Month 9 when service call logging ships.
                  Phase 3 ($49) starts Month 18 with the full feature set.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-3">What about enterprise pricing?</h3>
                <p className="text-gray-700 text-sm">
                  We're focused on proving the core product works before building enterprise features.
                  Multi-location portfolio management and advanced API access will come with
                  enterprise tiers in Year 2.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-3">How many tanks per facility?</h3>
                <p className="text-gray-700 text-sm">
                  Pricing is per facility, not per tank. Early Adopter covers up to 5 tanks,
                  Standard up to 10 tanks. Most independent gas stations
                  have 3-4 tanks, so this covers typical use cases.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 bg-blue-600 text-white">
        <div className="container mx-auto px-4 sm:px-6 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold mb-6">
              Ready to get started?
            </h2>
            <p className="text-lg mb-8 text-blue-100">
              Join our beta program for free, or secure the Early Adopter founding rate.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/get-access"
                className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-colors"
              >
                Join Early Access
              </Link>
              <a
                href="https://app.tankid.io"
                className="bg-white text-orange-600 hover:bg-gray-100 px-8 py-4 rounded-lg font-semibold text-lg transition-colors"
              >
                Try Facility Lookup
              </a>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
