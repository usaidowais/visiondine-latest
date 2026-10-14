"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  Check,
  ChevronDown,
  ArrowRight,
  Menu,
  X,
  MessageCircle,
  Phone,
  Mail,
  Smartphone,
  ExternalLink,
} from "lucide-react";

/* ═══════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════ */

const NAV_LINKS = [
  { id: "home", label: "Home" },
  { id: "demo", label: "Demo" },
  { id: "pricing", label: "Pricing" },
  { id: "faq", label: "FAQ" },
  { id: "contact", label: "Contact" },
];

interface PricingFeature {
  text: string;
}

interface PricingTier {
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  description: string;
  features: PricingFeature[];
  cta: string;
  popular: boolean;
  tier: "starter" | "pro" | "premium";
}

const PRICING_TIERS: PricingTier[] = [
  {
    name: "Starter",
    monthlyPrice: 49,
    yearlyPrice: 39,
    description: "$5 per additional item",
    features: [
      { text: "Up to 5 AR food items" },
      { text: "Up to 3 menu changes per month" },
      { text: "1 restaurant location" },
      { text: "Basic monthly analytics report" },
      { text: "Standard QR code (PDF)" },
      { text: "Email support" },
    ],
    cta: "Get Started",
    popular: false,
    tier: "starter",
  },
  {
    name: "Pro",
    monthlyPrice: 89,
    yearlyPrice: 71,
    description: "$3 per additional item",
    features: [
      { text: "Up to 40 AR food items" },
      { text: "Up to 5 menu changes per month" },
      { text: "Up to 5 restaurant locations" },
      { text: "Advanced monthly analytics report" },
      { text: "Dynamic snap to Instagram story" },
      { text: "Real-time marketing assets" },
      { text: "Dynamic QR code (PDF)" },
      { text: "Support: Priority support" },
    ],
    cta: "Get Pro",
    popular: true,
    tier: "pro",
  },
  {
    name: "Premium",
    monthlyPrice: 129,
    yearlyPrice: 103,
    description: "Custom pricing available",
    features: [
      { text: "Up to 100+ AR food items" },
      { text: "Unlimited menu changes per month" },
      { text: "Unlimited locations" },
      { text: "Real-time analytics & reporting" },
      { text: "Brand identity & social media story" },
      { text: "White-label options & reports" },
      { text: "AI-assisted marketing assets" },
      { text: "Advanced custom branded QR code" },
      { text: "Support: Priority + Dedicated" },
    ],
    cta: "Contact Sales",
    popular: false,
    tier: "premium",
  },
];

const FAQ_ITEMS = [
  {
    question: "Do customers need to download an app?",
    answer:
      "No! VisionDine uses WebAR technology that works directly in any modern mobile browser. Customers simply scan a QR code and instantly see your dishes in stunning 3D — no app download required.",
  },
  {
    question: "How do we upload our 3D models?",
    answer:
      "Our team handles everything for you. Simply send us high-quality photos of your dishes, and our 3D artists will create photorealistic AR models. You can also upload your own .glb files through the dashboard.",
  },
  {
    question: "Does this work for all cuisines?",
    answer:
      "Absolutely. VisionDine works with any type of cuisine — from sushi and steaks to desserts and cocktails. Our 3D modeling team specializes in capturing the unique textures, colors, and presentation of every dish.",
  },
  {
    question: "How does the per-food pricing work?",
    answer:
      "Each pricing tier includes a set number of AR food items. You choose which dishes to feature in AR. You can swap items anytime within your monthly change limit, making it easy to highlight seasonal specials or bestsellers.",
  },
];

/* ═══════════════════════════════════════════
   LANDING PAGE
   ═══════════════════════════════════════════ */

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">(
    "yearly"
  );
  const [scrolled, setScrolled] = useState(false);

  /* ── Scroll tracking for navbar shadow ── */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* ── Lock body scroll when mobile menu is open ── */
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const toggleFaq = (idx: number) =>
    setOpenFaq(openFaq === idx ? null : idx);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  /* ═══════════════ RENDER ═══════════════ */
  return (
    <div className="min-h-screen bg-[#fbf9f8] font-hanken text-[#1b1c1c]">
      {/* ─────────────── NAVBAR ─────────────── */}
      <nav
        id="navbar"
        className={`fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b transition-shadow duration-300 ${
          scrolled
            ? "border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
            : "border-transparent"
        }`}
      >
        <div className="max-w-[1280px] mx-auto px-4 md:px-10 flex items-center justify-between h-16">
          {/* Logo */}
          <a
            href="#home"
            className="font-manrope text-xl font-extrabold tracking-tight text-[#1b1c1c] select-none"
          >
            Vision<span className="text-teal-500">Dine</span>
          </a>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <a
                key={link.id}
                href={`#${link.id}`}
                className="text-sm font-medium text-[#3c4948] hover:text-teal-500 transition-colors duration-200"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Mobile hamburger */}
          <button
            id="mobile-menu-toggle"
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile menu */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ease-out ${
            mobileMenuOpen ? "max-h-80 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="bg-white border-t border-gray-100 px-4 py-4 flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <a
                key={link.id}
                href={`#${link.id}`}
                onClick={closeMobileMenu}
                className="block px-4 py-3 rounded-lg text-sm font-medium text-[#3c4948] hover:bg-gray-50 hover:text-teal-500 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </nav>

      <main>
        {/* ─────────────── HERO ─────────────── */}
        <section
          id="home"
          className="pt-28 md:pt-36 pb-16 md:pb-20 px-4 md:px-10"
        >
          <div className="max-w-[1280px] mx-auto text-center">
            <h1 className="font-manrope text-[32px] md:text-[48px] font-extrabold leading-[40px] md:leading-[56px] tracking-[-0.02em] text-[#1b1c1c]">
              Turn Every Table Into a Visual
              <br />
              Showcase.
            </h1>
            <p className="mt-5 md:mt-6 text-base md:text-lg leading-7 text-[#3c4948] max-w-2xl mx-auto">
              Ditch the static PDF and the costly app development. VisionDine is
              a web-native AR platform that transforms your menu into a
              high-conversion 3D experience with a single QR scan.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
              <a
                id="cta-primary"
                href="#demo"
                className="inline-flex items-center justify-center gap-2 bg-teal-400 hover:bg-teal-500 text-white font-semibold px-7 py-3 rounded-lg transition-all duration-200 active:scale-[0.98] shadow-sm hover:shadow-md w-full sm:w-auto"
              >
                Try it out now
                <ArrowRight size={16} strokeWidth={2.5} />
              </a>
              <a
                id="cta-secondary"
                href="#pricing"
                className="inline-flex items-center justify-center gap-2 border-2 border-[#1b1c1c] text-[#1b1c1c] font-semibold px-7 py-3 rounded-lg hover:bg-[#1b1c1c] hover:text-white transition-all duration-200 active:scale-[0.98] w-full sm:w-auto"
              >
                View Pricing
              </a>
            </div>
          </div>
        </section>

        {/* ─────────────── DEMO VIDEO ─────────────── */}
        <section id="demo" className="pb-16 md:pb-24 px-4 md:px-10">
          <div className="max-w-[960px] mx-auto space-y-10">
            {/* Video player */}
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-[#1b1c1c] shadow-lg ring-1 ring-black/5">
              <video
                className="absolute inset-0 w-full h-full object-cover"
                controls
                playsInline
                preload="metadata"
                poster=""
              >
                <source src="/demo-video.mov" type="video/quicktime" />
                <source src="/demo-video.mov" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>

            {/* QR Code + Try it panel */}
            <div className="bg-white rounded-2xl border border-[#e5e2da] p-6 md:p-10 flex flex-col md:flex-row items-center gap-8 md:gap-12">
              {/* QR Code */}
              <div className="shrink-0 flex flex-col items-center gap-3">
                <div className="bg-white p-3 rounded-xl border border-[#e5e2da] shadow-sm">
                  <Image
                    src="/demo-qr.png"
                    alt="Scan to view AR Menu demo"
                    width={180}
                    height={180}
                    className="rounded-lg"
                  />
                </div>
                <p className="font-jetbrains text-[11px] font-medium text-[#6c7a78] uppercase tracking-wider">
                  Scan with your phone
                </p>
              </div>

              {/* Description + Link */}
              <div className="flex-1 text-center md:text-left">
                <div className="inline-flex items-center gap-2 bg-teal-50 text-teal-600 font-jetbrains text-[11px] font-medium uppercase tracking-wider px-3 py-1.5 rounded-full mb-4">
                  <Smartphone size={14} />
                  Live Demo
                </div>
                <h3 className="font-manrope text-xl md:text-2xl font-bold text-[#1b1c1c]">
                  Experience the AR Menu
                </h3>
                <p className="mt-2 text-sm md:text-base text-[#3c4948] leading-relaxed max-w-lg">
                  Scan the QR code with your phone camera or tap the link below
                  to explore a live demo of our AR-powered restaurant menu.
                </p>
                <a
                  href="/menu/khansaab"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-5 bg-teal-400 hover:bg-teal-500 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-200 active:scale-[0.98] shadow-sm hover:shadow-md"
                >
                  Open AR Menu Demo
                  <ExternalLink size={16} strokeWidth={2.5} />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ─────────────── PRICING ─────────────── */}
        <section id="pricing" className="py-16 md:py-24 px-4 md:px-10">
          <div className="max-w-[1280px] mx-auto">
            <h2 className="font-manrope text-2xl md:text-[36px] font-bold leading-tight text-center text-[#1b1c1c]">
              Simple, Transparent Pricing
            </h2>

            {/* Billing toggle */}
            <div className="flex items-center justify-center gap-2 mt-8">
              <div className="inline-flex items-center bg-[#e9e8e7] rounded-full p-1">
                <button
                  id="toggle-monthly"
                  onClick={() => setBillingPeriod("monthly")}
                  className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                    billingPeriod === "monthly"
                      ? "bg-white text-[#1b1c1c] shadow-sm"
                      : "text-[#6c7a78] hover:text-[#3c4948]"
                  }`}
                >
                  Monthly
                </button>
                <button
                  id="toggle-yearly"
                  onClick={() => setBillingPeriod("yearly")}
                  className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                    billingPeriod === "yearly"
                      ? "bg-white text-[#1b1c1c] shadow-sm"
                      : "text-[#6c7a78] hover:text-[#3c4948]"
                  }`}
                >
                  Yearly
                </button>
              </div>
              <span className="font-jetbrains text-[11px] font-medium text-teal-600 bg-teal-50 px-2.5 py-1 rounded-full">
                Save20%
              </span>
            </div>

            {/* Pricing cards */}
            <div className="grid md:grid-cols-3 gap-6 lg:gap-8 mt-12 items-start">
              {PRICING_TIERS.map((tier) => (
                <div key={tier.name} className="flex flex-col items-center">
                  {/* Popular badge */}
                  {tier.popular && (
                    <span className="font-jetbrains text-[11px] font-medium tracking-wide uppercase bg-[#1b1c1c] text-white px-4 py-1.5 rounded-full mb-4">
                      Most Popular
                    </span>
                  )}
                  {/* Spacer for non-popular cards to align them */}
                  {!tier.popular && <div className="h-[34px] mb-4" />}

                  {/* Card */}
                  <div
                    className={`w-full bg-white rounded-2xl p-7 lg:p-8 flex flex-col transition-all duration-300 hover:shadow-[0_4px_20px_rgba(10,10,10,0.04)] ${
                      tier.popular
                        ? "border-2 border-teal-400 shadow-md"
                        : "border border-[#e5e2da]"
                    }`}
                  >
                    {/* Tier name */}
                    <div className="flex items-center gap-2">
                      <h3 className="font-manrope text-lg font-bold text-[#1b1c1c]">
                        {tier.name}
                      </h3>
                      {tier.popular && (
                        <span className="font-jetbrains text-[10px] font-medium text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">
                          Pro
                        </span>
                      )}
                    </div>

                    {/* Price */}
                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="font-manrope text-[40px] font-extrabold leading-none text-[#1b1c1c]">
                        $
                        {billingPeriod === "monthly"
                          ? tier.monthlyPrice
                          : tier.yearlyPrice}
                      </span>
                      <span className="text-[#6c7a78] text-sm font-medium">
                        /month
                      </span>
                    </div>
                    <p className="text-xs text-[#6c7a78] mt-1">
                      {billingPeriod === "yearly"
                        ? "Billed annually"
                        : tier.description}
                    </p>

                    {/* Divider */}
                    <div className="h-px bg-[#e5e2da] my-6" />

                    {/* Features */}
                    <ul className="flex flex-col gap-3 flex-1">
                      {tier.features.map((feature, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2.5 text-sm text-[#3c4948]"
                        >
                          <Check
                            size={16}
                            strokeWidth={2.5}
                            className="text-teal-500 mt-0.5 shrink-0"
                          />
                          <span>{feature.text}</span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    <div className="mt-8">
                      {tier.tier === "pro" ? (
                        <a
                          href="#contact"
                          className="block w-full text-center bg-teal-400 hover:bg-teal-500 text-white font-semibold py-3 rounded-lg transition-all duration-200 active:scale-[0.98] shadow-sm hover:shadow-md"
                        >
                          {tier.cta}
                        </a>
                      ) : tier.tier === "premium" ? (
                        <a
                          href="#contact"
                          className="block w-full text-center border-2 border-[#1b1c1c] text-[#1b1c1c] font-semibold py-3 rounded-lg hover:bg-[#1b1c1c] hover:text-white transition-all duration-200 active:scale-[0.98]"
                        >
                          {tier.cta}
                        </a>
                      ) : (
                        <a
                          href="#contact"
                          className="block w-full text-center border-2 border-[#1b1c1c] text-[#1b1c1c] font-semibold py-3 rounded-lg hover:bg-[#1b1c1c] hover:text-white transition-all duration-200 active:scale-[0.98]"
                        >
                          {tier.cta}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─────────────── FAQ ─────────────── */}
        <section id="faq" className="py-16 md:py-24 px-4 md:px-10">
          <div className="max-w-[720px] mx-auto">
            <h2 className="font-manrope text-2xl md:text-[36px] font-bold leading-tight text-center text-[#1b1c1c]">
              Frequently Asked Questions
            </h2>

            <div className="mt-10 md:mt-12 flex flex-col gap-3">
              {FAQ_ITEMS.map((item, idx) => (
                <div
                  key={idx}
                  className={`bg-white rounded-xl border transition-all duration-200 ${
                    openFaq === idx
                      ? "border-[#bbc9c7] shadow-sm"
                      : "border-[#e5e2da] hover:border-[#bbc9c7]"
                  }`}
                >
                  {/* Question button */}
                  <button
                    id={`faq-toggle-${idx}`}
                    onClick={() => toggleFaq(idx)}
                    className="w-full flex items-center justify-between px-5 md:px-6 py-4 text-left gap-4"
                  >
                    <span className="font-medium text-[15px] text-[#1b1c1c]">
                      {item.question}
                    </span>
                    <ChevronDown
                      size={18}
                      className={`text-[#6c7a78] shrink-0 transition-transform duration-300 ${
                        openFaq === idx ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {/* Answer (animated) */}
                  <div
                    className={`grid transition-all duration-300 ease-out ${
                      openFaq === idx
                        ? "grid-rows-[1fr] opacity-100"
                        : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p className="px-5 md:px-6 pb-5 text-sm leading-relaxed text-[#3c4948]">
                        {item.answer}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─────────────── CONTACT ─────────────── */}
        <section
          id="contact"
          className="py-16 md:py-24 px-4 md:px-10 bg-[#f5f3f3]"
        >
          <div className="max-w-[1280px] mx-auto">
            <h2 className="font-manrope text-2xl md:text-[36px] font-bold leading-tight text-[#1b1c1c]">
              Get in Touch
            </h2>

            <div className="grid md:grid-cols-2 gap-10 lg:gap-16 mt-10 md:mt-12">
              {/* ── Contact form ── */}
              <form
                id="contact-form"
                action="https://formspree.io/f/YOUR_ENDPOINT_HERE"
                method="POST"
                className="flex flex-col gap-5"
              >
                {/* Name */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="contact-name"
                    className="text-sm font-medium text-[#1b1c1c]"
                  >
                    Name
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    name="name"
                    placeholder="Your name"
                    required
                    className="px-4 py-3 bg-white border border-[rgba(27,28,28,0.1)] rounded-lg text-sm text-[#1b1c1c] placeholder-[#6c7a78] outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 transition-all duration-200"
                  />
                </div>

                {/* Restaurant */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="contact-restaurant"
                    className="text-sm font-medium text-[#1b1c1c]"
                  >
                    Restaurant
                  </label>
                  <input
                    id="contact-restaurant"
                    type="text"
                    name="restaurant"
                    placeholder="Restaurant name"
                    required
                    className="px-4 py-3 bg-white border border-[rgba(27,28,28,0.1)] rounded-lg text-sm text-[#1b1c1c] placeholder-[#6c7a78] outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 transition-all duration-200"
                  />
                </div>

                {/* Message */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="contact-message"
                    className="text-sm font-medium text-[#1b1c1c]"
                  >
                    Message
                  </label>
                  <textarea
                    id="contact-message"
                    name="message"
                    placeholder="How can we help?"
                    rows={4}
                    required
                    className="px-4 py-3 bg-white border border-[rgba(27,28,28,0.1)] rounded-lg text-sm text-[#1b1c1c] placeholder-[#6c7a78] outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 transition-all duration-200 resize-none"
                  />
                </div>

                {/* Submit */}
                <button
                  id="contact-submit"
                  type="submit"
                  className="mt-1 w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-teal-400 hover:bg-teal-500 text-white font-semibold px-8 py-3 rounded-lg transition-all duration-200 active:scale-[0.98] shadow-sm hover:shadow-md"
                >
                  Send Message
                </button>
              </form>

              {/* ── Contact cards ── */}
              <div className="flex flex-col gap-4">
                {/* WhatsApp */}
                <a
                  id="contact-whatsapp"
                  href="https://wa.me/1234567890"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-4 bg-white rounded-xl border border-[#e5e2da] p-5 hover:shadow-[0_4px_20px_rgba(10,10,10,0.04)] hover:border-[#bbc9c7] transition-all duration-200"
                >
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-green-50 text-green-600 group-hover:scale-105 transition-transform duration-200">
                    <MessageCircle size={22} />
                  </div>
                  <div>
                    <h4 className="font-manrope font-bold text-[15px] text-[#1b1c1c]">
                      WhatsApp
                    </h4>
                    <p className="text-sm text-[#6c7a78] mt-0.5">
                      Chat with us anytime
                    </p>
                  </div>
                </a>

                {/* Direct Call */}
                <a
                  id="contact-call"
                  href="tel:+1234567890"
                  className="group flex items-center gap-4 bg-white rounded-xl border border-[#e5e2da] p-5 hover:shadow-[0_4px_20px_rgba(10,10,10,0.04)] hover:border-[#bbc9c7] transition-all duration-200"
                >
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-orange-50 text-orange-500 group-hover:scale-105 transition-transform duration-200">
                    <Phone size={22} />
                  </div>
                  <div>
                    <h4 className="font-manrope font-bold text-[15px] text-[#1b1c1c]">
                      Direct Call
                    </h4>
                    <p className="text-sm text-[#6c7a78] mt-0.5">
                      Book a quick demo call
                    </p>
                  </div>
                </a>

                {/* Email */}
                <a
                  id="contact-email"
                  href="mailto:hello@visiondine.com"
                  className="group flex items-center gap-4 bg-white rounded-xl border border-[#e5e2da] p-5 hover:shadow-[0_4px_20px_rgba(10,10,10,0.04)] hover:border-[#bbc9c7] transition-all duration-200"
                >
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-rose-50 text-rose-500 group-hover:scale-105 transition-transform duration-200">
                    <Mail size={22} />
                  </div>
                  <div>
                    <h4 className="font-manrope font-bold text-[15px] text-[#1b1c1c]">
                      Email
                    </h4>
                    <p className="text-sm text-[#6c7a78] mt-0.5">
                      Send us a message
                    </p>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ─────────────── FOOTER ─────────────── */}
      <footer className="py-6 md:py-8 px-4 md:px-10 border-t border-[#e5e2da] bg-[#fbf9f8]">
        <div className="max-w-[1280px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <a
            href="#home"
            className="font-manrope text-lg font-extrabold tracking-tight text-[#1b1c1c] select-none"
          >
            Vision<span className="text-teal-500">Dine</span>
          </a>

          <div className="flex items-center gap-6">
            <a
              href="#"
              className="text-sm text-[#3c4948] hover:text-teal-500 transition-colors duration-200"
            >
              Terms of Service
            </a>
            <a
              href="#"
              className="text-sm text-[#3c4948] hover:text-teal-500 transition-colors duration-200"
            >
              Privacy Policy
            </a>
          </div>

          <p className="text-sm text-[#6c7a78]">
            © 2026 VisionDine. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
