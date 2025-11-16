'use client';

import { motion } from 'framer-motion';
import type { Tutor } from '@/types';
import { cn } from '@/lib/utils';

interface TutorCardProps {
  tutor: Tutor;
  index?: number;
}

export default function TutorCard({ tutor, index = 0 }: TutorCardProps) {
  // Group availability by day
  const availabilityByDay = tutor.availability.reduce(
    (acc, slot) => {
      if (!acc[slot.day]) {
        acc[slot.day] = [];
      }
      acc[slot.day].push(slot);
      return acc;
    },
    {} as Record<string, typeof tutor.availability>
  );

  const modeColors = {
    online: 'bg-blue-100 text-blue-800 border-blue-200',
    'on campus': 'bg-green-100 text-green-800 border-green-200',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      className="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900">{tutor.name}</h3>
          {tutor.pronouns && (
            <p className="text-sm text-gray-500 mt-1">{tutor.pronouns}</p>
          )}
        </div>
        <span
          className={cn(
            'px-3 py-1 rounded-full text-xs font-semibold border',
            modeColors[tutor.mode]
          )}
        >
          {tutor.mode}
        </span>
      </div>

      {/* Bio */}
      <p className="text-gray-700 mb-4 leading-relaxed">{tutor.bio}</p>

      {/* Skills */}
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-2">Skills:</h4>
        <div className="flex flex-wrap gap-2">
          {tutor.skills.map((skill) => (
            <span
              key={skill}
              className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs font-medium"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>

      {/* Availability */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-2">Availability:</h4>
        <div className="space-y-2">
          {Object.entries(availabilityByDay).map(([day, slots]) => (
            <div key={day} className="flex items-start gap-2">
              <span className="text-sm font-medium text-gray-700 min-w-[80px]">
                {day}:
              </span>
              <div className="flex flex-wrap gap-2">
                {slots.map((slot, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 bg-gray-50 text-gray-700 rounded text-xs border border-gray-200"
                  >
                    {slot.time}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

