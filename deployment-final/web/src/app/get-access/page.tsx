'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

export default function GetAccessPage() {
  const [formData, setFormData] = useState({
    userType: 'facility',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    location: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleUserTypeChange = (userType: string) => {
    setFormData(prev => ({
      ...prev,
      userType
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission (replace with actual API call)
    try {
      // Here you would typically send the data to your backend
      console.log('Form submitted:', formData);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSubmitted(true);
    } catch (error) {
      console.error('Error submitting form:', error);
      // Handle error (show error message)
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navigation />

      {/* Hero Section */}
      <section className="pt-20 py-16 bg-blue-600 text-white">
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-4xl font-bold mb-6">Get Early Access to TankID</h1>
          <p className="text-xl mb-8 max-w-3xl mx-auto">
            We're onboarding pilot facilities and service companies now. Fill in your info and we'll 
            reach out within one business day.
          </p>
        </div>
      </section>

      {/* Form Section */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="max-w-2xl mx-auto">
            {submitted ? (
              // Success Message
              <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
                <div className="text-green-600 text-5xl mb-4">✓</div>
                <h2 className="text-2xl font-bold text-green-800 mb-4">Request Submitted!</h2>
                <p className="text-green-700 mb-6">
                  Thank you for your interest in TankID. We'll contact you within 1 business day to 
                  discuss your pilot program participation.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold">
                    Back to Home
                  </Link>
                  <a href="https://app.tankid.io" className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg font-semibold">
                    Try Facility Lookup
                  </a>
                </div>
              </div>
            ) : (
              // Form
              <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-lg">
                {/* User Type Selector */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">I am a:</label>
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                      type="button"
                      onClick={() => handleUserTypeChange('facility')}
                      className={`flex-1 py-2 px-4 rounded-md font-semibold transition-colors ${
                        formData.userType === 'facility' 
                          ? 'bg-blue-600 text-white' 
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Facility owner
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUserTypeChange('technician')}
                      className={`flex-1 py-2 px-4 rounded-md font-semibold transition-colors ${
                        formData.userType === 'technician' 
                          ? 'bg-blue-600 text-white' 
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Field technician
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUserTypeChange('company')}
                      className={`flex-1 py-2 px-4 rounded-md font-semibold transition-colors ${
                        formData.userType === 'company' 
                          ? 'bg-blue-600 text-white' 
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Service company
                    </button>
                  </div>
                </div>

                {/* Name Fields */}
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                      First name *
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      required
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="First name"
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                      Last name *
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      required
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Last name"
                    />
                  </div>
                </div>

                {/* Contact Fields */}
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email address *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Email address"
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                      Phone number
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Phone number"
                    />
                  </div>
                </div>

                {/* Company/Location Fields */}
                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">
                      Company name
                    </label>
                    <input
                      type="text"
                      id="company"
                      name="company"
                      value={formData.company}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Company name"
                    />
                  </div>
                  <div>
                    <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                      City, State *
                    </label>
                    <input
                      type="text"
                      id="location"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      required
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="City, State"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full font-semibold py-4 px-8 rounded-lg text-lg transition-colors ${
                    isSubmitting 
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {isSubmitting ? 'Submitting...' : 'Request early access →'}
                </button>

                <p className="text-sm text-gray-500 mt-4 text-center">
                  No credit card required. We'll contact you within 1 business day.
                </p>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">What you'll get as a pilot user</h2>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="font-bold text-gray-900 mb-3">Early access pricing</h3>
                <p className="text-gray-700">
                  Pilot users receive significant discounts on their first year of TankID service as thanks 
                  for helping us perfect the platform.
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="font-bold text-gray-900 mb-3">Direct input on features</h3>
                <p className="text-gray-700">
                  Your feedback directly shapes TankID's development. Help us build exactly what the industry needs.
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="font-bold text-gray-900 mb-3">Priority support</h3>
                <p className="text-gray-700">
                  Pilot users get direct access to our development team for questions, training, and technical support.
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="font-bold text-gray-900 mb-3">Full data ownership</h3>
                <p className="text-gray-700">
                  Your tank data remains yours. Export it any time, and if you decide TankID isn't right, 
                  take your data with you.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}