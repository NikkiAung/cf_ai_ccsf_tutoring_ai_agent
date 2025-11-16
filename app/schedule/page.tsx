'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import TutorCard from '@/components/schedule/TutorCard';
import ChatInterface from '@/components/schedule/ChatInterface';
import type { Tutor } from '@/types';

export default function Schedule() {
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTutors() {
      try {
        const response = await fetch('/api/tutors');
        if (!response.ok) {
          throw new Error('Failed to fetch tutors');
        }
        const data = await response.json();
        setTutors(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchTutors();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.6, -0.05, 0.01, 0.99] }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Tutor Schedule</h1>
          <p className="text-gray-600">
            Browse available tutors or chat with our AI assistant to find the perfect match
          </p>
        </motion.div>

        {/* Chat Interface Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="mb-12"
        >
          <ChatInterface />
        </motion.div>

        {/* Tutors Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Available Tutors</h2>
          
          {loading && (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
              <p className="font-semibold">Error loading tutors</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {!loading && !error && tutors.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg">
              <p>No tutors available at the moment.</p>
            </div>
          )}

          {!loading && !error && tutors.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {tutors.map((tutor, index) => (
                <TutorCard key={tutor.id} tutor={tutor} index={index} />
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

