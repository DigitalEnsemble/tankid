import Link from 'next/link';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

export default function ContactUsPage() {
  return (
    <div className="min-h-screen">
      <Navigation />

      {/* Hero Section */}
      <section className="pt-20 py-16 bg-blue-600 text-white">
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-4xl font-bold mb-6">Contact Us</h1>
          <p className="text-xl mb-8 max-w-3xl mx-auto">
            Ready to get started with TankID? Have questions about our platform? 
            Reach out to our team — we're here to help.
          </p>
        </div>
      </section>

      {/* Contact Information */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <div className="bg-gray-50 p-8 rounded-lg">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Get in Touch</h3>
              
              <div className="space-y-6 max-w-2xl mx-auto">
                <div className="text-center">
                  <h4 className="font-bold text-gray-900 text-lg">Jack Hughes</h4>
                  <p className="text-blue-600 font-semibold">Chief of Staff</p>
                  <a href="mailto:jack.hughes@tankid.io" className="text-gray-700 hover:text-blue-600">
                    jack.hughes@tankid.io
                  </a>
                </div>
                
                <div className="text-center">
                  <h4 className="font-bold text-gray-900 text-lg">Casey Wells</h4>
                  <p className="text-blue-600 font-semibold">Director of Marketing</p>
                  <a href="mailto:casey.wells@tankid.io" className="text-gray-700 hover:text-blue-600">
                    casey.wells@tankid.io
                  </a>
                </div>
                
                <div className="text-center">
                  <h4 className="font-bold text-gray-900 text-lg">Alex</h4>
                  <p className="text-blue-600 font-semibold">Co-founder & Director of Strategy</p>
                  <a href="mailto:alex@tankid.io" className="text-gray-700 hover:text-blue-600">
                    alex@tankid.io
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}