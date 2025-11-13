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

type Resource = {
  title: string;
  link?: {
    href: string;
    label?: string;
  };
  usefulFor: string;
  description: string;
};

const RESOURCES: Resource[] = [
  {
    title: 'Python Tutor',
    link: { href: 'https://pythontutor.com' },
    usefulFor: 'Python, Java, C, C++, JavaScript, Ruby',
    description:
      "Don't let the name fool you! Python Tutor visualizes code execution one line at a time so you can watch variables and the call stack update as your program runs—perfect for building understanding and debugging.",
  },
  {
    title: 'Logging Into and Using Hills',
    link: {
      href: 'https://docs.google.com/document/d/e/2PACX-1vTcmCa0wOqRkZpRcwwlgix68yp5adqIfL9kFPK2FnFB0nqWxzhrXfGOgfu1P2OZSnSpqP9WTElDvqTx/pub',
    },
    usefulFor: 'Connecting to the CCSF hills cluster from Windows, macOS, or Linux',
    description:
      'Step-by-step directions for connecting to the hills computer cluster from different operating systems, plus a link to the ACRC handout that covers logging in and out from an on-campus lab machine.',
  },
  {
    title: 'Using Hills and VS Code',
    link: {
      href: 'https://docs.google.com/document/u/3/d/e/2PACX-1vRnYIP0gaAj7fSNjQtUnq8FOunShkTNKvKksVMdvTRKLIb9gSFntZ6ynb5ZpvpAlH2_3-TlaQXeBvjM/pub',
    },
    usefulFor: 'Editing hills files directly in VS Code',
    description:
      'A picture-heavy walkthrough that shows how to connect VS Code to the hills server so you can browse directories, edit files, and run code without leaving your favorite editor.',
  },
  {
    title: 'Python Cheatsheet',
    link: { href: 'https://www.pythoncheatsheet.org/' },
    usefulFor: 'Python syntax and standard library',
    description:
      'A curated quick reference with concise examples covering everything from data structures and file handling to virtual environments.',
  },
  {
    title: 'Command Challenge',
    link: { href: 'https://cmdchallenge.com/' },
    usefulFor: 'Linux command line practice',
    description:
      'Turn terminal practice into a game: each challenge prompts you to accomplish a task using a single command, helping you build muscle memory and confidence with the shell.',
  },
  {
    title: 'Basic UNIX Commands',
    link: { href: 'https://hills.ccsf.edu/~jpotter/resources/gboyd_basic_unix_commands.html' },
    usefulFor: 'Quick Linux command reference',
    description:
      'Former CS 160A instructor Greg Boyd compiled this handy list of essential UNIX commands—a perfect refresher when you just need to recall the right flag or syntax.',
  },
  {
    title: 'Online Bash Shell IDE (JDoodle)',
    link: { href: 'https://www.jdoodle.com/test-bash-shell-script-online/' },
    usefulFor: 'Testing and sharing Bash scripts',
    description:
      'Run bash scripts inside your browser, share the output, and experiment without needing local shell access—great for quick experimentation or collaboration.',
  },
  {
    title: 'Vim Cheat Sheet',
    link: { href: 'https://vim.rtorr.com/' },
    usefulFor: 'Vim commands and shortcuts',
    description:
      'A beautifully organized reference for vim modes, navigation, editing, macros, and more. Keep it nearby while you level up your command-line editing skills.',
  },
  {
    title: 'VIM Adventures',
    link: { href: 'https://vim-adventures.com/' },
    usefulFor: 'Learning vim through play',
    description:
      'Explore a Zelda-style world that teaches vim commands as gameplay mechanics. It’s a surprisingly fun way to internalize shortcuts and navigation patterns.',
  },
];

export default function Resources() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-white to-white py-16">
      <div className="mx-auto max-w-5xl px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.6, -0.05, 0.01, 0.99] }}
          className="mb-10 text-center"
        >
          <span className="text-sm uppercase tracking-[0.35em] text-sky-700">Tutor squad picks</span>
          <h1 className="mt-3 text-3xl font-serif font-semibold text-slate-900 sm:text-4xl">
            Helpful Resources for Tutors & Students
          </h1>
          <p className="mt-4 text-base text-slate-600 sm:text-lg">
            Curated by our Tutor Squad and the CS department to support your coursework, deepen your understanding, and keep
            you exploring.
          </p>
        </motion.div>

        <AnimatedSection delay={0.15}>
          <div className="rounded-3xl border-l-4 border-emerald-400 bg-emerald-50 p-6 shadow-sm">
            <p className="text-sm font-medium uppercase tracking-widest text-emerald-600">How to use this page</p>
            <p className="mt-3 text-base leading-relaxed text-emerald-800">
              We’ve highlighted what each resource is best for so you can jump straight to the help you need—whether that’s
              stepping through tricky code, sharpening command-line skills, or mastering tools like vim and VS Code on the hills
              cluster.
            </p>
          </div>
        </AnimatedSection>

        <div className="mt-12 grid gap-8 sm:grid-cols-2">
          {RESOURCES.map((resource, index) => (
            <AnimatedSection
              key={resource.title}
              delay={0.2 + index * 0.05}
              className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-100 transition duration-300 hover:-translate-y-1 hover:shadow-md"
            >
              <div className="relative z-10">
                <h2 className="text-xl font-semibold text-slate-900">{resource.title}</h2>
                <p className="mt-2 text-sm font-medium uppercase tracking-widest text-slate-500">
                  Useful for: <span className="normal-case text-slate-700">{resource.usefulFor}</span>
                </p>
                <p className="mt-4 text-sm leading-relaxed text-slate-600">{resource.description}</p>
                {resource.link ? (
                  <a
                    href={resource.link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-6 inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                  >
                    {resource.link.label ?? 'Visit resource'}
                    <span aria-hidden>↗</span>
                  </a>
                ) : (
                  <span className="mt-6 inline-flex items-center gap-2 rounded-full bg-slate-200 px-4 py-2 text-sm font-medium text-slate-600">
                    Link coming soon
                  </span>
                )}
              </div>
              <div className="absolute inset-0 opacity-0 transition group-hover:opacity-100">
                <div className="h-full w-full bg-gradient-to-br from-slate-900/5 via-transparent to-sky-200/30" />
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </div>
  );
}
