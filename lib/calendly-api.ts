// Alternative approach: Use Calendly API if available
// Note: This requires Calendly API access and OAuth setup

import type { BookSessionRequest } from '@/types';

/**
 * Check if Calendly API is available and configured
 */
export function isCalendlyApiAvailable(): boolean {
  return !!(
    process.env.CALENDLY_API_TOKEN ||
    process.env.CALENDLY_ACCESS_TOKEN
  );
}

/**
 * Create a Calendly event invitation using their API
 * This is the proper way to automate bookings
 * 
 * Documentation: https://developer.calendly.com/api-docs
 */
export async function createCalendlyInvitation(
  request: BookSessionRequest
): Promise<{ success: boolean; inviteeUrl?: string; message: string }> {
  // This would require:
  // 1. Calendly API access
  // 2. OAuth setup
  // 3. Event type UUID
  // 4. Proper date/time formatting
  
  // For now, return a message about setup
  return {
    success: false,
    message: 'Calendly API integration requires setup. See: https://developer.calendly.com/api-docs',
  };
}

/**
 * Generate a Calendly URL with pre-filled data using URL parameters
 * Note: Calendly doesn't support pre-filling all fields via URL,
 * but we can at least set the date/time
 */
export function generateCalendlyUrlWithParams(request: BookSessionRequest): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayIndex = days.findIndex(d => d.toLowerCase() === request.day.toLowerCase());
  const now = new Date();
  const currentDay = now.getDay();
  let daysUntilTarget = (dayIndex - currentDay + 7) % 7;
  
  if (daysUntilTarget === 0) {
    const [hours] = request.time.split('-')[0].split(':').map(Number);
    const targetTime = new Date(now);
    targetTime.setHours(hours, 0, 0, 0);
    if (targetTime < now) {
      daysUntilTarget = 7;
    }
  }

  const targetDate = new Date(now);
  targetDate.setDate(now.getDate() + daysUntilTarget);
  const [hours, minutes] = request.time.split('-')[0].split(':').map(Number);
  targetDate.setHours(hours, minutes, 0, 0);

  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  const day = String(targetDate.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00-08:00`;
  
  // Calendly URL with date/time pre-selected
  // Note: Form fields cannot be pre-filled via URL parameters
  const baseUrl = `https://calendly.com/cs-tutor-squad/30min/${dateStr}`;
  const params = new URLSearchParams({
    back: '1',
    month: `${year}-${month}`,
    date: `${year}-${month}-${day}`,
  });
  
  return `${baseUrl}?${params.toString()}`;
}

