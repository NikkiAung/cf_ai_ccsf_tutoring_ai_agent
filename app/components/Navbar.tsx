'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const MotionLink = motion(Link);

export default function Navbar() {
  const pathname = usePathname();

  const navLinks = [
    { href: '/schedule', label: 'Schedule' },
    { href: '/rules', label: 'Rules' },
    { href: '/bios', label: 'Bios' },
    { href: '/resources', label: 'Resources' },
  ];

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10">
        <div className="flex justify-between items-center h-20">
          {/* Logo Section */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <motion.div
              className="w-7 h-7 flex items-center justify-center"
              whileHover={{ scale: 1.1 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="w-7 h-7 text-black"
              >
                <path
                  d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </motion.div>
            <motion.span
              className="text-2xl font-bold text-black tracking-tight"
              whileHover={{ opacity: 0.8 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              CCSF
            </motion.span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-2">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'relative px-5 py-2.5 rounded-full text-sm font-medium',
                    'overflow-hidden',
                    isActive
                      ? 'text-gray-900'
                      : 'text-gray-600'
                  )}
                >
                  {/* Glass oval overlay on hover with ultra-smooth animation */}
                  <motion.span
                    className={cn(
                      'absolute inset-0 rounded-full',
                      'backdrop-blur-md bg-white/55 border border-white/70',
                      'shadow-sm shadow-black/5'
                    )}
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{
                      scale: isActive ? 1 : 0.95,
                      opacity: isActive ? 1 : 0,
                      backgroundColor: isActive ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.55)',
                      borderColor: isActive ? 'rgba(229, 231, 235, 0.4)' : 'rgba(255, 255, 255, 0.7)',
                    }}
                    whileHover={{
                      scale: 1,
                      opacity: 1,
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 30,
                    }}
                  />
                  <motion.span
                    className="relative z-10"
                    animate={{
                      color: isActive ? 'rgb(17, 24, 39)' : 'rgb(75, 85, 99)',
                    }}
                    whileHover={{
                      color: 'rgb(17, 24, 39)',
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 30,
                    }}
                  >
                    {link.label}
                  </motion.span>
                </Link>
              );
            })}
          </div>

          {/* CTA Button */}
          <div className="flex items-center">
            <Button
              className="bg-black text-white rounded-full px-6 py-2.5 text-sm font-medium shadow-sm"
              asChild
            >
              <MotionLink
                href="/schedule"
                whileHover={{
                  backgroundColor: 'rgb(17, 24, 39)',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 30,
                }}
              >
                Book a Session
              </MotionLink>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}

