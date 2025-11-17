// AI utility functions for tutor matching using RAG (Retrieval-Augmented Generation)
// Uses semantic search with embeddings + LLM reasoning
// Implements: Structured Outputs (Lesson 7)

import { config } from '@/config';
import type { Tutor, MatchTutorRequest, MatchTutorResponse } from '@/types';
import { searchSimilarTutors } from './vectorize';
import { getStructuredTutorMatch, type TutorMatchOutput } from './langchain-structured';

/**
 * Use RAG (Retrieval-Augmented Generation) to match a tutor
 * 1. Semantic search using embeddings to find similar tutors
 * 2. LLM reasoning to select the best match from top candidates
 */
export async function matchTutor(
  tutors: Tutor[],
  request: MatchTutorRequest
): Promise<MatchTutorResponse | null> {
  // Try RAG-based matching first
  try {
    // Step 1: Semantic search using embeddings
    const similarTutors = await searchSimilarTutors(
      request.skill,
      request.day,
      request.time,
      request.mode,
      5 // Get top 5 candidates
    );

    if (similarTutors.length === 0) {
      // No semantic matches, fall back to keyword matching
      return matchTutorSimple(tutors, request);
    }

    // Step 2: Get the actual tutor objects for top candidates
    const candidateTutors = similarTutors
      .map(result => tutors.find(t => t.id === result.tutorId))
      .filter((t): t is Tutor => t !== undefined)
      .slice(0, 5); // Top 5 candidates

    if (candidateTutors.length === 0) {
      return matchTutorSimple(tutors, request);
    }

    // Step 3: Use LLM to select best match from candidates
    if (!config.openai.apiKey) {
      // No API key, use top semantic match
      const topMatch = candidateTutors[0];
      return createMatchResponse(topMatch, request, similarTutors[0].score, 'Semantically matched based on your requirements');
    }

    // Use structured output for tutor matching (Lesson 7)
    try {
      const skills = Array.isArray(request.skill) ? request.skill : [request.skill];
      const skillsText = skills.join(', ');
      
      const studentRequest = `Skills needed: ${skillsText}
${request.day ? `Preferred day: ${request.day}` : ''}
${request.time ? `Preferred time: ${request.time}` : ''}
${request.mode ? `Preferred mode: ${request.mode}` : ''}`;

      // Prepare candidate tutors data for structured output
      const candidateData = candidateTutors.map(tutor => ({
        name: tutor.name,
        skills: tutor.skills,
        mode: tutor.mode,
        bio: tutor.bio,
        availability: tutor.availability,
      }));

      // Use structured output (Lesson 7)
      const structuredMatch = await getStructuredTutorMatch(studentRequest, candidateData);
      
      // Find the matched tutor
      const matchedTutor = candidateTutors.find(
        (t) => t.name.toLowerCase() === structuredMatch.tutorName.toLowerCase()
      ) || candidateTutors[0]; // Fallback to top semantic match

      const similarityScore = similarTutors.find(r => r.tutorId === matchedTutor.id)?.score || 0;

      // Filter available slots based on preferences
      let availableSlots = structuredMatch.availableSlots.map(slot => ({
        day: slot.day,
        time: slot.time,
        mode: slot.mode as 'online' | 'on campus',
      }));

      // If structured output didn't provide slots, use tutor's actual availability
      if (availableSlots.length === 0) {
        availableSlots = matchedTutor.availability;
        if (request.day) {
          availableSlots = availableSlots.filter(
            (a) => a.day.toLowerCase() === request.day!.toLowerCase()
          );
        }
        if (request.time) {
          availableSlots = availableSlots.filter((a) => a.time.includes(request.time!));
        }
        if (request.mode) {
          availableSlots = availableSlots.filter((a) => a.mode === request.mode);
        }
      }

      return {
        tutor: matchedTutor,
        matchScore: similarityScore,
        reasoning: structuredMatch.reasoning,
        availableSlots: availableSlots.length > 0 ? availableSlots : matchedTutor.availability,
      };
    } catch (structuredError) {
      console.warn('Structured output failed, falling back to JSON parsing:', structuredError);
      
      // Fallback to original JSON parsing method
      const skills = Array.isArray(request.skill) ? request.skill : [request.skill];
      const skillsText = skills.join(', ');

      // High-quality SYSTEM_PROMPT to prevent hallucination (Lesson 1)
      const prompt = `You are a careful AI assistant helping match students with tutors for the CCSF CS Tutor Squad.

CRITICAL RULES:
- Think step-by-step before selecting a tutor
- NEVER make up tutor names, skills, or availability - only use the data provided below
- ALWAYS base your reasoning on actual tutor data
- Be specific and accurate in your recommendations
- If no tutor perfectly matches, select the best available option and explain why

Student Requirements:
- Skills needed: ${skillsText}
${request.day ? `- Preferred day: ${request.day}` : ''}
${request.time ? `- Preferred time: ${request.time}` : ''}
${request.mode ? `- Preferred mode: ${request.mode}` : ''}

Top Candidate Tutors (ranked by semantic similarity):
${candidateTutors.map((tutor, idx) => {
      const similarity = similarTutors.find(r => r.tutorId === tutor.id)?.score || 0;
      return `
${idx + 1}. ${tutor.name} (${tutor.pronouns || 'pronouns not specified'}) [Similarity: ${(similarity * 100).toFixed(1)}%]
   - Skills: ${tutor.skills.join(', ')}
   - Mode: ${tutor.mode}
   - Bio: ${tutor.bio}
   - Available: ${tutor.availability.map(a => `${a.day} ${a.time}`).join(', ')}
`;
    }).join('\n')}

Please:
1. Select the best matching tutor from the candidates above (return their EXACT name as shown)
2. Provide a brief reasoning (1-2 sentences) explaining why this tutor is the best match based on the data above
3. List available time slots that match the student's preferences (if any) - use EXACT format from the data above

Return your response as JSON:
{
  "tutorName": "Tutor Name",
  "reasoning": "Brief explanation based on actual tutor data",
  "availableSlots": [{"day": "Monday", "time": "9:30-10:00", "mode": "online"}]
}`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.openai.apiKey}`,
        },
        body: JSON.stringify({
          model: config.openai.model,
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that matches students with tutors. Always return valid JSON.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: config.openai.temperature,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json() as { choices: Array<{ message: { content: string } }> };
      const content = JSON.parse(data.choices[0].message.content);

      // Find the matched tutor
      const matchedTutor = candidateTutors.find(
        (t) => t.name.toLowerCase() === content.tutorName.toLowerCase()
      ) || candidateTutors[0]; // Fallback to top semantic match

      const similarityScore = similarTutors.find(r => r.tutorId === matchedTutor.id)?.score || 0;

      // Filter available slots based on preferences
      let availableSlots = matchedTutor.availability;
      if (request.day) {
        availableSlots = availableSlots.filter(
          (a) => a.day.toLowerCase() === request.day!.toLowerCase()
        );
      }
      if (request.time) {
        availableSlots = availableSlots.filter((a) => a.time.includes(request.time!));
      }
      if (request.mode) {
        availableSlots = availableSlots.filter((a) => a.mode === request.mode);
      }

      return {
        tutor: matchedTutor,
        matchScore: similarityScore, // Use semantic similarity score
        reasoning: content.reasoning || 'AI-matched based on semantic similarity and requirements',
        availableSlots: availableSlots.length > 0 ? availableSlots : matchedTutor.availability,
      };
    }
  } catch (error) {
    console.error('Error matching tutor with RAG:', error);
    // Fallback to simple matching
    return matchTutorSimple(tutors, request);
  }
}

/**
 * Helper to create match response
 */
function createMatchResponse(
  tutor: Tutor,
  request: MatchTutorRequest,
  score: number,
  reasoning: string
): MatchTutorResponse {
  // Filter available slots based on preferences
  let availableSlots = tutor.availability;
  if (request.day) {
    availableSlots = availableSlots.filter(
      (a) => a.day.toLowerCase() === request.day!.toLowerCase()
    );
  }
  if (request.time) {
    availableSlots = availableSlots.filter((a) => a.time.includes(request.time!));
  }
  if (request.mode) {
    availableSlots = availableSlots.filter((a) => a.mode === request.mode);
  }

  return {
    tutor,
    matchScore: score,
    reasoning,
    availableSlots: availableSlots.length > 0 ? availableSlots : tutor.availability,
  };
}

/**
 * Simple keyword-based tutor matching (fallback)
 */
function matchTutorSimple(
  tutors: Tutor[],
  request: MatchTutorRequest
): MatchTutorResponse | null {
  const skills = Array.isArray(request.skill) ? request.skill : [request.skill];
  const skillsLower = skills.map((s) => s.toLowerCase());

  // Score each tutor
  const scoredTutors = tutors.map((tutor) => {
    let score = 0;
    const tutorSkillsLower = tutor.skills.map((s) => s.toLowerCase());

    // Skill matching
    skillsLower.forEach((skill) => {
      if (tutorSkillsLower.some((ts) => ts.includes(skill) || skill.includes(ts))) {
        score += 10;
      }
    });

    // Mode matching
    if (request.mode && tutor.mode === request.mode) {
      score += 5;
    }

    // Day matching
    if (request.day) {
      const hasDay = tutor.availability.some(
        (a) => a.day.toLowerCase() === request.day!.toLowerCase()
      );
      if (hasDay) score += 3;
    }

    // Time matching
    if (request.time) {
      const hasTime = tutor.availability.some((a) => a.time.includes(request.time!));
      if (hasTime) score += 2;
    }

    return { tutor, score };
  });

  // Sort by score and get top match
  scoredTutors.sort((a, b) => b.score - a.score);
  const topMatch = scoredTutors[0];

  if (!topMatch || topMatch.score === 0) {
    return null;
  }

  // Filter available slots
  let availableSlots = topMatch.tutor.availability;
  if (request.day) {
    availableSlots = availableSlots.filter(
      (a) => a.day.toLowerCase() === request.day!.toLowerCase()
    );
  }
  if (request.time) {
    availableSlots = availableSlots.filter((a) => a.time.includes(request.time!));
  }
  if (request.mode) {
    availableSlots = availableSlots.filter((a) => a.mode === request.mode);
  }

  const reasoning = `Matched based on ${topMatch.tutor.skills.filter((s) =>
    skillsLower.some((req) => s.toLowerCase().includes(req) || req.includes(s.toLowerCase()))
  ).length} matching skill(s)`;

  return {
    tutor: topMatch.tutor,
    matchScore: topMatch.score / 20, // Normalize to 0-1
    reasoning,
    availableSlots: availableSlots.length > 0 ? availableSlots : topMatch.tutor.availability,
  };
}

