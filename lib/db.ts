// Database utility functions for Cloudflare D1
// These functions use prepared statements for security and performance

import type { D1Database } from '@cloudflare/workers-types';
import type { Tutor, TutorWithRelations, Availability, Skill } from '@/types';

// For Next.js development, we'll use a mock database interface
// In production with Cloudflare Workers, this will use D1Database
export interface Database {
  prepare(query: string): {
    bind(...values: unknown[]): {
      first<T = unknown>(): Promise<T | null>;
      all<T = unknown>(): Promise<{ results: T[] }>;
      run(): Promise<{ success: boolean; meta: { changes: number } }>;
    };
  };
}

/**
 * Get all tutors with their skills and availability
 */
export async function getAllTutors(db: Database): Promise<Tutor[]> {
  // Check if this is a mock database (has mockTutors property)
  if ('mockTutors' in db && typeof (db as any).mockTutors !== 'undefined') {
    // Direct access to mock data
    return (db as any).mockTutors;
  }

  // Get all tutors
  const tutorsQuery = db.prepare(`
    SELECT id, name, pronouns, bio, mode
    FROM tutors
    ORDER BY name
  `);
  // Call bind() first (even with no args), then all()
  const tutorsResult = await tutorsQuery.bind().all<TutorWithRelations>();
  const tutors = tutorsResult.results || [];

  // For each tutor, get skills and availability
  const tutorsWithRelations = await Promise.all(
    tutors.map(async (tutor) => {
      const skillsQuery = db.prepare(`
        SELECT s.id, s.name
        FROM skills s
        INNER JOIN tutor_skills ts ON s.id = ts.skill_id
        WHERE ts.tutor_id = ?
        ORDER BY s.name
      `);
      const skills = await skillsQuery.bind(tutor.id).all<Skill>();

      const availabilityQuery = db.prepare(`
        SELECT day, time, mode
        FROM availability
        WHERE tutor_id = ?
        ORDER BY 
          CASE day
            WHEN 'Monday' THEN 1
            WHEN 'Tuesday' THEN 2
            WHEN 'Wednesday' THEN 3
            WHEN 'Thursday' THEN 4
            WHEN 'Friday' THEN 5
            WHEN 'Saturday' THEN 6
            WHEN 'Sunday' THEN 7
          END,
          time
      `);
      const availability = await availabilityQuery.bind(tutor.id).all<Availability>();

      return {
        id: tutor.id,
        name: tutor.name,
        pronouns: tutor.pronouns,
        bio: tutor.bio,
        mode: tutor.mode,
        skills: skills.results.map((s) => s.name),
        availability: availability.results.map((a) => ({
          day: a.day,
          time: a.time,
          mode: a.mode,
        })),
      };
    })
  );

  return tutorsWithRelations;
}

/**
 * Get a single tutor by ID with skills and availability
 */
export async function getTutorById(db: Database, id: number): Promise<Tutor | null> {
  // Check if this is a mock database (has mockTutors property)
  if ('mockTutors' in db && typeof (db as any).mockTutors !== 'undefined') {
    const tutor = (db as any).mockTutors.find((t: Tutor) => t.id === id);
    return tutor || null;
  }

  const tutorQuery = db.prepare(`
    SELECT id, name, pronouns, bio, mode
    FROM tutors
    WHERE id = ?
  `);
  const tutor = await tutorQuery.bind(id).first<TutorWithRelations>();

  if (!tutor) {
    return null;
  }

  const skillsQuery = db.prepare(`
    SELECT s.id, s.name
    FROM skills s
    INNER JOIN tutor_skills ts ON s.id = ts.skill_id
    WHERE ts.tutor_id = ?
    ORDER BY s.name
  `);
  const skills = await skillsQuery.bind(id).all<Skill>();

  const availabilityQuery = db.prepare(`
    SELECT day, time, mode
    FROM availability
    WHERE tutor_id = ?
    ORDER BY 
      CASE day
        WHEN 'Monday' THEN 1
        WHEN 'Tuesday' THEN 2
        WHEN 'Wednesday' THEN 3
        WHEN 'Thursday' THEN 4
        WHEN 'Friday' THEN 5
        WHEN 'Saturday' THEN 6
        WHEN 'Sunday' THEN 7
      END,
      time
  `);
  const availability = await availabilityQuery.bind(id).all<Availability>();

  return {
    id: tutor.id,
    name: tutor.name,
    pronouns: tutor.pronouns,
    bio: tutor.bio,
    mode: tutor.mode,
    skills: skills.results.map((s) => s.name),
    availability: availability.results.map((a) => ({
      day: a.day,
      time: a.time,
      mode: a.mode,
    })),
  };
}

/**
 * Get tutors by skill(s)
 */
export async function getTutorsBySkills(
  db: Database,
  skills: string[]
): Promise<Tutor[]> {
  if (skills.length === 0) {
    return getAllTutors(db);
  }

  // Check if this is a mock database (has mockTutors property)
  if ('mockTutors' in db && typeof (db as any).mockTutors !== 'undefined') {
    const allTutors = (db as any).mockTutors as Tutor[];
    // Normalize skills for comparison (handle C++ specially)
    const normalizedSkills = skills.map((s) => {
      const normalized = s.toLowerCase().trim();
      // Handle C++ variations
      if (normalized === 'c++' || normalized === 'c\\+\\+' || normalized === 'cpp') {
        return 'c++';
      }
      return normalized;
    });
    
    return allTutors.filter((tutor) =>
      tutor.skills.some((skill) => {
        const normalizedTutorSkill = skill.toLowerCase().trim();
        // Handle C++ variations in tutor skills
        const tutorSkillNormalized = normalizedTutorSkill === 'c++' || normalizedTutorSkill === 'c\\+\\+' || normalizedTutorSkill === 'cpp' 
          ? 'c++' 
          : normalizedTutorSkill;
        
        return normalizedSkills.some((req) => {
          // Exact match for C++
          if (req === 'c++' && tutorSkillNormalized === 'c++') {
            return true;
          }
          // For other skills, use substring matching
          return tutorSkillNormalized.includes(req) || req.includes(tutorSkillNormalized);
        });
      })
    );
  }

  // Use parameterized query with IN clause
  const placeholders = skills.map(() => '?').join(',');
  const query = db.prepare(`
    SELECT DISTINCT t.id, t.name, t.pronouns, t.bio, t.mode
    FROM tutors t
    INNER JOIN tutor_skills ts ON t.id = ts.tutor_id
    INNER JOIN skills s ON ts.skill_id = s.id
    WHERE s.name IN (${placeholders})
    ORDER BY t.name
  `);
  const tutors = await query.bind(...skills).all<TutorWithRelations>();

  // Get full tutor details with skills and availability
  const tutorsWithRelations = await Promise.all(
    tutors.results.map(async (tutor) => {
      return getTutorById(db, tutor.id);
    })
  );

  return tutorsWithRelations.filter((t): t is Tutor => t !== null);
}

/**
 * Get availability grouped by tutor
 */
export async function getAvailabilityByTutor(db: Database): Promise<
  Array<{
    tutor: Tutor;
    availability: Availability[];
  }>
> {
  const tutors = await getAllTutors(db);
  return tutors.map((tutor) => ({
    tutor,
    availability: tutor.availability.map((a) => ({
      tutor_id: tutor.id,
      day: a.day,
      time: a.time,
      mode: a.mode,
    })),
  }));
}

/**
 * Get tutors matching skill and optional day/time/mode filters
 */
export async function getMatchingTutors(
  db: Database,
  skill: string | string[],
  day?: string,
  time?: string,
  mode?: 'online' | 'on campus'
): Promise<Tutor[]> {
  const skills = Array.isArray(skill) ? skill : [skill];
  let tutors = await getTutorsBySkills(db, skills);

  // Filter by day if provided
  if (day) {
    tutors = tutors.filter((tutor) =>
      tutor.availability.some((a) => a.day.toLowerCase() === day.toLowerCase())
    );
  }

  // Filter by time if provided
  if (time) {
    tutors = tutors.filter((tutor) =>
      tutor.availability.some((a) => a.time.includes(time))
    );
  }

  // Filter by mode if provided
  if (mode) {
    tutors = tutors.filter((tutor) => tutor.mode === mode);
  }

  return tutors;
}

