'use client';


import { useRef } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { Button } from '@/components/ui/button';
import TechStack from './TechStack';

// Constants
const ZOOM_LINK = 'https://ccsf-edu.zoom.us/j/92121773277';
const ZOOM_MEETING_ID = '921 2177 3277';
const ZOOM_MEETING_DIGITS = ZOOM_MEETING_ID.replace(/\s/g, '');
const ZOOM_LOCAL_NUMBER_URL = 'https://ccsf-edu.zoom.us/u/asSuUAeom';
const ZOOM_SKYPE_LINK = `https://ccsf-edu.zoom.us/skype/${ZOOM_MEETING_DIGITS}`;
const VIDEO_ID = '1XXWdW8UaBc44SnzYcyP0LqFt0GIYjnso';
const CONTACT_EMAIL = 'questions-cs-tutor-squad@googlegroups.com';
const FEEDBACK_EMAIL = 'jpotter@ccsf.edu';
const LEARNING_ASSISTANCE_URL = 'https://www.ccsf.edu/departments/learning-assistance';

const ON_CAMPUS_HOURS = [
  { day: 'Monday', hours: '10am - 4pm', studyGroup: '110C study group 12pm - 2pm' },
  { day: 'Tuesday', hours: '12pm - 6pm', studyGroup: '111C study group 12pm - 2pm' },
  { day: 'Wednesday', hours: '10am - 4pm', studyGroup: '110C study group 12pm - 2pm' },
  { day: 'Thursday', hours: '11am - 6pm', studyGroup: '111C study group 12pm - 2pm' },
] as const;

const ZOOM_PHONE_NUMBERS = [
  { number: '+1 669 900 6833', location: 'US (San Jose)' },
  { number: '+1 346 248 7799', location: 'US (Houston)' },
  { number: '+1 253 215 8782', location: 'US (Tacoma)' },
  { number: '+1 301 715 8592', location: 'US (Washington DC)' },
  { number: '+1 312 626 6799', location: 'US (Chicago)' },
  { number: '+1 929 205 6099', location: 'US (New York)' },
] as const;

const IMPORTANT_NOTES = [
  {
    text: (
      <>
        <strong>All Zoom tutoring sessions will be recorded!</strong> Recordings will be kept private unless requested by
        either the tutor or the student being tutored as part of an incident report. By joining any tutoring session at
        the link above, you are indicating that you are okay with being recorded.
      </>
    ),
  },
  {
    text: 'One or more students from other sections may be present during your session with a tutor.',
  },
  {
    text: (
      <>
        Please review the <Link href="/rules" className="text-blue-600 hover:underline font-semibold">rules and suggestions</Link>{' '}
        for tutoring sessions before attending! If you don't adhere to the rules above, you may have your tutoring session cut
        short, have one or more of your appointments removed, or be banned from receiving tutoring. Please take these rules
        seriously and ask a tutor if you have any questions about them!
      </>
    ),
  },
] as const;

const ANIMATION_EASING = [0.6, -0.05, 0.01, 0.99] as const;

type AnimatedSectionProps = {
  children: React.ReactNode;
  delay?: number;
  className?: string;
};

function AnimatedSection({ children, delay = 0, className = '' }: AnimatedSectionProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 60 }}
      transition={{
        duration: 0.6,
        delay,
        ease: ANIMATION_EASING,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function HeroSection() {
  return (
    <div className="text-center mb-8">
      <motion.h1
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: ANIMATION_EASING }}
        className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-4"
      >
        Computer Science Tutor Squad
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2, ease: ANIMATION_EASING }}
        className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto mb-8"
      >
        Welcome to the Computer Science Tutor Squad at City College of San Francisco!
      </motion.p>
      <motion.p
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3, ease: ANIMATION_EASING }}
        className="text-lg text-gray-700 max-w-2xl mx-auto"
      >
        Our awesome student tutors are excited to help you with your coursework in computer science classes. Tutoring is
        available both on campus and on Zoom.
      </motion.p>
    </div>
  );
}

function VideoSection() {
  return (
    <AnimatedSection delay={0.5} className="mb-16">
      <div className="max-w-4xl mx-auto">
        <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
          <iframe
            src={`https://drive.google.com/file/d/${VIDEO_ID}/preview`}
            className="absolute top-0 left-0 w-full h-full rounded-lg shadow-2xl"
            allow="autoplay"
            allowFullScreen
          />
        </div>
      </div>
    </AnimatedSection>
  );
}

function ImportantNotes() {
  return (
    <AnimatedSection delay={0.6} className="mb-16">
      <div className="bg-amber-50 border-l-4 border-amber-400 p-6 rounded-r-lg max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">⚠️ Important Notes</h2>
        <ul className="space-y-3 text-gray-700">
          {IMPORTANT_NOTES.map((note, index) => (
            <li key={`note-${index}`} className="flex items-start">
              <span className="mr-2">•</span>
              <span>{note.text}</span>
            </li>
          ))}
        </ul>
        <div className="mt-6 pt-6 border-t border-amber-200">
          <p className="text-gray-700 mb-2">
            <strong>Questions?</strong> Email us at:{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-600 hover:underline font-semibold">
              {CONTACT_EMAIL}
            </a>
          </p>
          <p className="text-gray-700">
            <strong>Feedback?</strong> Fill out this anonymous form or send an email to:{' '}
            <a href={`mailto:${FEEDBACK_EMAIL}`} className="text-blue-600 hover:underline font-semibold">
              {FEEDBACK_EMAIL}
            </a>
          </p>
        </div>
      </div>
    </AnimatedSection>
  );
}

function ZoomLinkSection() {
  return (
    <AnimatedSection delay={0.7} className="mb-16">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 max-w-4xl mx-auto text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">🔗 Zoom Link</h2>
        <p className="text-lg text-gray-700 mb-6">Virtual tutoring occurs at this Zoom link:</p>
        <Button
          asChild
          size="lg"
          className="bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl rounded-lg mb-4"
        >
          <a href={ZOOM_LINK} target="_blank" rel="noopener noreferrer">
            Join Zoom Meeting
          </a>
        </Button>
        <p className="text-sm text-gray-600 mt-4">
          Meeting ID: <strong>{ZOOM_MEETING_ID}</strong>
        </p>
      </div>
    </AnimatedSection>
  );
}

function ScheduleSection() {
  return (
    <AnimatedSection delay={0.8} className="mb-16">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">📅 Schedule</h2>
        <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-lg">
          <p className="text-lg text-gray-700 mb-6 text-center">
            <strong>*** Tutoring Schedule ***</strong>
          </p>
          <p className="text-gray-700 mb-4">
            Please <Link href="/schedule" className="text-blue-600 hover:underline font-semibold">book an appointment</Link> if you can! If you
            don't have an appointment, you are still welcome to join the Zoom session on a drop-in basis. If the tutor on
            duty is busy, they will let you know and will give you the option to remain in the waiting room.
          </p>
          <p className="text-gray-700 mb-6">
            If there are no tutors available at the times you'd prefer, please let us know through this anonymous form or send
            an email to <a href={`mailto:${FEEDBACK_EMAIL}`} className="text-blue-600 hover:underline font-semibold">{FEEDBACK_EMAIL}</a>. While
            we cannot guarantee that we'll be able to accommodate you, we'll do our best!
          </p>
          <Button asChild size="lg" className="w-full bg-gray-900 text-white hover:bg-gray-800 rounded-lg">
            <Link href="/schedule">View Full Schedule →</Link>
          </Button>
        </div>
      </div>
    </AnimatedSection>
  );
}

function OnCampusTutoring() {
  return (
    <AnimatedSection delay={0.9} className="mb-16">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">🏫 On-Campus Tutoring</h2>
        <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-lg">
          <p className="text-gray-700 mb-6">
            There will be limited on-campus tutoring in the <strong>Academic Computing Resource Center (ACRC)</strong> on the 3rd floor of{' '}
            <strong>Batmale Hall (Batmale 301)</strong>. Students are also welcome to drop in just to have a place to study.
          </p>
          <p className="text-amber-600 font-semibold mb-6">
            ⚠️ Please check back for hour updates frequently, as the hours are very likely to change during the first few weeks of the semester!
          </p>
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Hours:</h3>
            <div className="space-y-3 text-gray-700">
              {ON_CAMPUS_HOURS.map((schedule, index) => (
                <div
                  key={schedule.day}
                  className={`flex justify-between items-center py-2 ${index < ON_CAMPUS_HOURS.length - 1 ? 'border-b border-gray-200' : ''}`}
                >
                  <span className="font-semibold">{schedule.day}</span>
                  <span>
                    {schedule.hours} <span className="text-gray-500">({schedule.studyGroup})</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AnimatedSection>
  );
}

function BookAppointmentSection() {
  return (
    <AnimatedSection delay={1.0} className="mb-16">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">📝 Book an Appointment (Virtual Only)</h2>
        <Button asChild size="lg" className="bg-green-600 text-white hover:bg-green-700 shadow-lg hover:shadow-xl rounded-lg">
          <Link href="/schedule">Book Your Appointment Now</Link>
        </Button>
      </div>
    </AnimatedSection>
  );
}

function OtherTutoringSection() {
  return (
    <AnimatedSection delay={1.1} className="mb-16">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">📚 Other Tutoring</h2>
        <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-lg">
          <p className="text-gray-700 leading-relaxed">
            City College offers free tutoring services in over 30 academic disciplines. To learn how to access online tutoring,
            students self-enroll in Canvas' Learning Assistance Online, which is free to all students. For more information,
            please review the{' '}
            <a href={LEARNING_ASSISTANCE_URL} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-semibold">
              Learning Assistance Department website
            </a>
            .
          </p>
        </div>
      </div>
    </AnimatedSection>
  );
}

function AdditionalZoomDetails() {
  return (
    <AnimatedSection delay={1.2} className="mb-16">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">📞 Additional Zoom Details</h2>
        <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-lg">
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Join Zoom Meeting</h3>
              <a href={ZOOM_LINK} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">
                {ZOOM_LINK}
              </a>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Meeting ID</h3>
              <p className="text-gray-700">{ZOOM_MEETING_ID}</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">One tap mobile</h3>
              <div className="space-y-1 text-gray-700">
                {ZOOM_PHONE_NUMBERS.slice(0, 2).map((phone) => (
                  <p key={`onetap-${phone.number}`}>
                    {phone.number},,{ZOOM_MEETING_DIGITS}# {phone.location}
                  </p>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Dial by your location</h3>
              <div className="space-y-1 text-gray-700">
                {ZOOM_PHONE_NUMBERS.map((phone) => (
                  <p key={`dial-${phone.number}`}>
                    {phone.number} {phone.location}
                  </p>
                ))}
              </div>
              <p className="text-sm text-gray-600 mt-2">Meeting ID: {ZOOM_MEETING_ID}</p>
              <p className="text-sm text-gray-600 mt-2">
                <a href={ZOOM_LOCAL_NUMBER_URL} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  Find your local number
                </a>
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Join by Skype for Business</h3>
              <a href={ZOOM_SKYPE_LINK} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">
                {ZOOM_SKYPE_LINK}
              </a>
            </div>
          </div>
        </div>
      </div>
    </AnimatedSection>
  );
}

export default function HomeContent() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-white to-white">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 py-16 md:py-24">
        <HeroSection />

        <AnimatedSection delay={0.4} className="-mt-20 mb-16">
          <TechStack />
        </AnimatedSection>

        <AnimatedSection delay={0.45} className="text-center mb-12 -mt-20">
          <Button asChild size="lg" className="bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl rounded-lg">
            <Link href="/schedule">📅 Click here for the tutoring schedule for fall 2025</Link>
          </Button>
        </AnimatedSection>

        <VideoSection />
        <ImportantNotes />
        <ZoomLinkSection />
        <ScheduleSection />
        <OnCampusTutoring />
        <BookAppointmentSection />
        <OtherTutoringSection />
        <AdditionalZoomDetails />
      </div>
    </div>
  );
}

