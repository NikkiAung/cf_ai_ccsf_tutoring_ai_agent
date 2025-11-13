'use client';

import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';

function AnimatedSection({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 60 }}
      transition={{ 
        duration: 0.6, 
        delay,
        ease: [0.6, -0.05, 0.01, 0.99] 
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const DO_ITEMS: React.ReactNode[] = [
  <>
    Follow the{' '}
    <a
      href="https://www.ccsf.edu/about-ccsf/administration/student-affairs/student-conduct-and-discipline"
      target="_blank"
      rel="noreferrer"
      className="font-semibold text-sky-700 hover:underline"
    >
      CCSF Student Code of Conduct
    </a>
    . As a recipient of tutoring, you are held to the same standards of behavior as in other areas of the college.
  </>,
  <>
    Be kind to the tutors. They are students, just like you! If you’re feeling frustrated with a problem, please don’t take it out on them—they’re doing their best to help.
  </>,
  <>
    <span className="font-semibold">Limit appointments to one per day.</span> If you book more than one appointment on a given day, tutors will only prioritize you for the first appointment. Additional help will depend on drop-in demand.
  </>,
  <>
    <span className="font-semibold">Keep weekly appointments reasonable.</span> Please avoid booking every single day—other students need tutoring, too!
  </>,
];

const TRY_ITEMS: React.ReactNode[] = [
  <>
    <span className="font-semibold">Be on time for appointments.</span> If an emergency arises, missing or being late is understandable. If you know you’ll be late or need to cancel, email the Tutor Squad at{' '}
    <a href="mailto:questions-cs-tutor-squad@googlegroups.com" className="font-semibold text-sky-700 hover:underline">
      questions-cs-tutor-squad@googlegroups.com
    </a>.
  </>,
  <>
    Read all assignment instructions before asking for help so you can describe the problem clearly and identify specific questions.
  </>,
  <>Work out a partial solution before you visit—it helps tutors understand your thought process and the hurdles you’re facing.</>,
];

export default function Rules() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-white to-white py-16">
      <div className="mx-auto max-w-4xl px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.6, -0.05, 0.01, 0.99] }}
          className="mb-10 text-center"
        >
          <span className="text-sm uppercase tracking-[0.35em] text-sky-700">Tutor squad etiquette</span>
          <h1 className="mt-3 text-3xl font-serif font-semibold text-slate-900 sm:text-4xl">
            CS Tutor Squad Rules and Suggestions
          </h1>
          <p className="mt-4 text-base text-slate-600 sm:text-lg">
            Please follow the rules below—and keep the suggestions in mind—whenever you make use of the tutoring services
            offered by the CS Tutor Squad.
          </p>
        </motion.div>

        <AnimatedSection delay={0.15} className="mb-10">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm shadow-slate-100">
            <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">Do</h2>
            <p className="mt-3 text-sm text-slate-500 sm:text-base">
              These expectations help keep tutoring productive and welcoming for everyone.
            </p>
            <ul className="mt-6 space-y-4">
              {DO_ITEMS.map((item, index) => (
                <li key={`do-${index}`} className="flex items-start gap-3 text-slate-700">
                  <motion.span
                    className="mt-2 inline-flex h-2.5 w-2.5 flex-none rounded-full bg-sky-600"
                    initial={{ scale: 1, opacity: 0.9 }}
                    animate={{ scale: [1, 1.35, 1], opacity: [0.9, 1, 0.9] }}
                    transition={{ duration: 1.6, repeat: Infinity, delay: index * 0.2, ease: 'easeInOut' }}
                  />
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </AnimatedSection>

        <AnimatedSection delay={0.25} className="mb-10">
          <div className="rounded-3xl border-l-4 border-amber-400 bg-amber-50 p-6 shadow-sm">
            <p className="text-sm font-medium uppercase tracking-widest text-amber-600">Important reminder</p>
            <p className="mt-3 text-base leading-relaxed text-amber-800">
              If you don’t adhere to the rules above, you may have your tutoring session cut short, have one or more of your
              appointments removed, or be banned from receiving tutoring. Please take these rules seriously and ask a tutor if
              you have any questions about them.
            </p>
          </div>
        </AnimatedSection>

        <AnimatedSection delay={0.35}>
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm shadow-slate-100">
            <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">Try to</h2>
            <p className="mt-3 text-sm text-slate-500 sm:text-base">
              These suggestions make the most of the time you have with a tutor.
            </p>
            <ul className="mt-6 space-y-4">
              {TRY_ITEMS.map((item, index) => (
                <li key={`try-${index}`} className="flex items-start gap-3 text-slate-700">
                  <motion.span
                    className="mt-2 inline-flex h-2.5 w-2.5 flex-none rounded-full bg-emerald-500"
                    initial={{ scale: 1, opacity: 0.9 }}
                    animate={{ scale: [1, 1.35, 1], opacity: [0.9, 1, 0.9] }}
                    transition={{ duration: 1.6, repeat: Infinity, delay: index * 0.2 + 0.1, ease: 'easeInOut' }}
                  />
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </AnimatedSection>
      </div>
    </div>
  );
}
