'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { MatchTutorRequest, MatchTutorResponse } from '@/types';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  tutorMatch?: MatchTutorResponse;
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hi! 👋 I'm your AI scheduling assistant for the CCSF CS Tutor Squad.\n\nI can help you:\n• Find the perfect tutor for your programming needs\n• Automatically book tutoring sessions\n• Match you with tutors based on your schedule and preferences\n\n**What programming languages or topics do you need help with?**\n\n💡 **Example prompts:**\n• \"I need help with Python\"\n• \"Looking for a Java tutor on Monday\"\n• \"Help with JavaScript, available Tuesday afternoon\"\n• \"Python tutor, online sessions preferred\"",
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingMatch, setPendingMatch] = useState<MatchTutorResponse | null>(null);
  const [lastSearchCriteria, setLastSearchCriteria] = useState<MatchTutorRequest | null>(null);
  const [availableTutorsList, setAvailableTutorsList] = useState<MatchTutorResponse[]>([]);
  const [bookingInfo, setBookingInfo] = useState<{
    studentName: string;
    studentEmail: string;
    ccsfEmail: string;
    studentId?: string;
    allowOtherStudents?: boolean;
    classes?: string[];
    specificHelp?: string;
    additionalNotes?: string;
    slot: { day: string; time: string; mode: string };
    step: 'name-email' | 'ccsf-email' | 'student-id' | 'allow-others' | 'classes' | 'specific-help' | 'additional-notes' | 'complete';
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim().toLowerCase();
    const userMessageOriginal = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessageOriginal }]);
    setIsLoading(true);

    try {
      // Check if user is confirming a booking
      if (pendingMatch && (userMessage === 'yes' || userMessage === 'y' || userMessage.includes('book') || userMessage.includes('confirm'))) {
        // User wants to book - start collecting details
        const firstSlot = pendingMatch.availableSlots[0];
        setBookingInfo({
          studentName: '',
          studentEmail: '',
          ccsfEmail: '',
          slot: {
            day: firstSlot.day,
            time: firstSlot.time,
            mode: firstSlot.mode,
          },
          step: 'name-email',
        });
        
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `Great! To book a session with ${pendingMatch.tutor.name} on ${firstSlot.day} at ${firstSlot.time} (${firstSlot.mode}), I'll need some information:\n\n**Step 1/7:** Please provide:\n- Your name\n- Your school email (ends with @mail.ccsf.edu)\n\nFormat: "Name: [Your Name], Email: [Your @mail.ccsf.edu Email]"`,
          },
        ]);
        setIsLoading(false);
        return;
      }

      // Handle multi-step booking form
      if (bookingInfo && pendingMatch) {
        const currentStep = bookingInfo.step;
        
        if (currentStep === 'name-email') {
          const nameMatch = userMessage.match(/name:\s*([^,]+)/i) || userMessage.match(/my name is\s+([^,]+)/i);
          const emailMatch = userMessage.match(/email:\s*([^\s,]+)/i) || userMessage.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
          
          if (nameMatch && emailMatch) {
            const studentName = nameMatch[1].trim();
            const providedEmail = emailMatch[1].trim();
            
            // Check if the provided email is a CCSF email
            const isCCSFEmail = /@mail\.ccsf\.edu$/i.test(providedEmail);
            
            if (isCCSFEmail) {
              // If it's a CCSF email, use it for both regular email and CCSF email
              setBookingInfo({ 
                ...bookingInfo, 
                studentName, 
                studentEmail: providedEmail,
                ccsfEmail: providedEmail,
                step: 'student-id' 
              });
              setMessages((prev) => [
                ...prev,
                {
                  role: 'assistant',
                  content: `Thanks! **Step 2/6:** What is your CCSF student ID number? (You can skip this by typing "skip")`,
                },
              ]);
            } else {
              // If it's not a CCSF email, store it and ask for CCSF email
              setBookingInfo({ ...bookingInfo, studentName, studentEmail: providedEmail, step: 'ccsf-email' });
              setMessages((prev) => [
                ...prev,
                {
                  role: 'assistant',
                  content: `Thanks! **Step 2/7:** What is your @mail.ccsf.edu email address? (Please include this, even if it's the same as the email above)`,
                },
              ]);
            }
            setIsLoading(false);
            return;
          } else {
            setMessages((prev) => [
              ...prev,
              {
                role: 'assistant',
                content: "I need both your name and school email. Please provide them in this format:\n\nName: [Your Name], Email: [Your @mail.ccsf.edu Email]",
              },
            ]);
            setIsLoading(false);
            return;
          }
        }
        
        if (currentStep === 'ccsf-email') {
          const ccsfEmailMatch = userMessage.match(/([a-zA-Z0-9._%+-]+@mail\.ccsf\.edu)/i);
          if (ccsfEmailMatch) {
            const ccsfEmail = ccsfEmailMatch[1].trim();
            setBookingInfo({ ...bookingInfo, ccsfEmail, step: 'student-id' });
            setMessages((prev) => [
              ...prev,
              {
                role: 'assistant',
                content: `**Step 3/7:** What is your CCSF student ID number? (You can skip this by typing "skip")`,
              },
            ]);
            setIsLoading(false);
            return;
          } else {
            setMessages((prev) => [
              ...prev,
              {
                role: 'assistant',
                content: "Please provide your @mail.ccsf.edu email address.",
              },
            ]);
            setIsLoading(false);
            return;
          }
        }
        
        if (currentStep === 'student-id') {
          // Determine total steps based on whether we skipped CCSF email step
          const totalSteps = bookingInfo.ccsfEmail === bookingInfo.studentEmail ? 6 : 7;
          const currentStepNum = totalSteps === 6 ? 2 : 3;
          const nextStepNum = totalSteps === 6 ? 3 : 4;
          
          if (userMessage.includes('skip')) {
            setBookingInfo({ ...bookingInfo, step: 'allow-others' });
            setMessages((prev) => [
              ...prev,
              {
                role: 'assistant',
                content: `**Step ${nextStepNum}/${totalSteps}:** Are you okay with other students joining during your session?\n\nReply with "yes" or "no"`,
              },
            ]);
            setIsLoading(false);
            return;
          } else {
            const studentId = userMessage.trim();
            setBookingInfo({ ...bookingInfo, studentId, step: 'allow-others' });
            setMessages((prev) => [
              ...prev,
              {
                role: 'assistant',
                content: `**Step ${nextStepNum}/${totalSteps}:** Are you okay with other students joining during your session?\n\nReply with "yes" or "no"`,
              },
            ]);
            setIsLoading(false);
            return;
          }
        }
        
        if (currentStep === 'allow-others') {
          // Determine total steps
          const totalSteps = bookingInfo.ccsfEmail === bookingInfo.studentEmail ? 6 : 7;
          const currentStepNum = totalSteps === 6 ? 3 : 4;
          const nextStepNum = totalSteps === 6 ? 4 : 5;
          
          const allowOthers = userMessage.includes('yes') || userMessage.includes('y');
          setBookingInfo({ ...bookingInfo, allowOtherStudents: allowOthers, step: 'classes' });
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: `**Step ${nextStepNum}/${totalSteps}:** What classes are you seeking help for? Please list the course codes (e.g., "110A, 131B, MATH 108")\n\nAvailable: 110A, 110B, 110C, 111B, 111C, 131B, 150A, 155P, 160A, 160B, 195, 199, 211D, 211S, 231, 256, 260A, 270, MATH 108, MATH 115, Other`,
            },
          ]);
          setIsLoading(false);
          return;
        }
        
        if (currentStep === 'classes') {
          // Determine total steps
          const totalSteps = bookingInfo.ccsfEmail === bookingInfo.studentEmail ? 6 : 7;
          const currentStepNum = totalSteps === 6 ? 4 : 5;
          const nextStepNum = totalSteps === 6 ? 5 : 6;
          
          // Extract course codes
          const courseCodes = ['110A', '110B', '110C', '111B', '111C', '131B', '150A', '155P', '160A', '160B', '195', '199', '211D', '211S', '231', '256', '260A', '270', 'MATH 108', 'MATH 115', 'Other'];
          const foundClasses = courseCodes.filter(code => 
            userMessage.toUpperCase().includes(code.toUpperCase())
          );
          
          setBookingInfo({ ...bookingInfo, classes: foundClasses.length > 0 ? foundClasses : ['Other'], step: 'specific-help' });
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: `**Step ${nextStepNum}/${totalSteps}:** What specifically do you need help with? (e.g., "A programming assignment on nested loops")\n\nPlease don't copy/paste code here.`,
            },
          ]);
          setIsLoading(false);
          return;
        }
        
        if (currentStep === 'specific-help') {
          // Determine total steps
          const totalSteps = bookingInfo.ccsfEmail === bookingInfo.studentEmail ? 6 : 7;
          const currentStepNum = totalSteps === 6 ? 5 : 6;
          const nextStepNum = totalSteps === 6 ? 6 : 7;
          
          setBookingInfo({ ...bookingInfo, specificHelp: userMessageOriginal, step: 'additional-notes' });
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: `**Step ${nextStepNum}/${totalSteps}:** Anything else the tutor should know? (Type "no" or "skip" if nothing)`,
            },
          ]);
          setIsLoading(false);
          return;
        }
        
        if (currentStep === 'additional-notes') {
          const additionalNotes = (userMessage.includes('no') || userMessage.includes('skip')) ? undefined : userMessageOriginal;
          const finalBookingInfo = { ...bookingInfo, additionalNotes, step: 'complete' };
          
          // Now call the booking API with automation
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: `Perfect! I'm now booking your session and filling out the Calendly form automatically...`,
            },
          ]);
          
          const bookResponse = await fetch('/api/book', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              tutorId: pendingMatch.tutor.id,
              day: finalBookingInfo.slot.day,
              time: finalBookingInfo.slot.time,
              studentName: finalBookingInfo.studentName,
              studentEmail: finalBookingInfo.studentEmail,
              ccsfEmail: finalBookingInfo.ccsfEmail,
              studentId: finalBookingInfo.studentId,
              allowOtherStudents: finalBookingInfo.allowOtherStudents,
              classes: finalBookingInfo.classes,
              specificHelp: finalBookingInfo.specificHelp,
              additionalNotes: finalBookingInfo.additionalNotes,
              topic: pendingMatch.tutor.skills[0],
              automate: true, // Enable automation
            }),
          });

          if (!bookResponse.ok) {
            throw new Error('Failed to book session');
          }

          const bookResult = await bookResponse.json();
          
          if (bookResult.automationStatus === 'completed') {
            setMessages((prev) => [
              ...prev,
              {
                role: 'assistant',
                content: `✅ **Booking Complete!**\n\n📅 Session Details:\n- Tutor: ${bookResult.sessionDetails.tutor}\n- Day: ${bookResult.sessionDetails.day}\n- Time: ${bookResult.sessionDetails.time}\n- Mode: ${bookResult.sessionDetails.mode}\n\n🔗 Your booking form has been automatically filled!\n\n${bookResult.calendlyUrl}\n\nPlease review and submit the form to complete your booking.`,
              },
            ]);
          } else {
            // Show the error message from the API if available
            const errorMsg = bookResult.message || 'Automation failed';
            setMessages((prev) => [
              ...prev,
              {
                role: 'assistant',
                content: `⚠️ **Booking Attempt**\n\n📅 Session Details:\n- Tutor: ${bookResult.sessionDetails.tutor}\n- Day: ${bookResult.sessionDetails.day}\n- Time: ${bookResult.sessionDetails.time}\n- Mode: ${bookResult.sessionDetails.mode}\n\n${errorMsg}\n\n🔗 Booking Link:\n${bookResult.calendlyUrl}\n\nPlease click the link to complete your booking on Calendly. Some fields may need to be filled manually.`,
              },
            ]);
          }
          
          setPendingMatch(null);
          setBookingInfo(null);
          setIsLoading(false);
          return;
        }
      }

      // Check for greetings - respond with friendly introduction
      const greetingPattern = /^(hi|hello|hey|greetings|what's up|sup|howdy|good morning|good afternoon|good evening)[\s!.,]*$/i;
      if (greetingPattern.test(userMessage)) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: "Hey there! 👋\n\nI'm here to help you find the perfect tutor and automatically schedule your tutoring session. I can match you with tutors based on:\n• Programming languages (Python, Java, JavaScript, C++, etc.)\n• Your preferred day and time\n• Online or on-campus sessions\n\n**What do you need help with?**\n\n💡 **Try asking:**\n• \"I need help with Python\"\n• \"Looking for a Java tutor available on Monday\"\n• \"Help with JavaScript, Tuesday afternoon, online\"\n• \"Python tutor for data structures\"",
          },
        ]);
        setIsLoading(false);
        return;
      }

      // Check if user wants to see other tutors FIRST (before tutor selection)
      // This prevents false matches when user says "show me other tutors"
      const otherTutorsPattern = /(other|more|else|another|different|show me|list|all|who else|anyone else|any other)/i;
      if (otherTutorsPattern.test(userMessage)) {
        // Use last search criteria if available, otherwise extract from current message
        let searchCriteria = lastSearchCriteria;
        
        if (!searchCriteria) {
          // Try to extract skill from current message
          const skillMatch = userMessage.match(/\b(python|java|javascript|react|html|css|linux|sql|c\+\+|mips|assembly|debugging)\b/i);
          if (skillMatch) {
            // Capitalize first letter for consistency
            const skill = skillMatch[1].charAt(0).toUpperCase() + skillMatch[1].slice(1).toLowerCase();
            searchCriteria = {
              skill: skill,
              day: undefined,
              time: undefined,
              mode: undefined,
            };
          } else if (pendingMatch) {
            // Use the skill from the last match
            searchCriteria = {
              skill: pendingMatch.tutor.skills[0] || 'Python',
              day: undefined,
              time: undefined,
              mode: undefined,
            };
          }
        }
        
        if (!searchCriteria) {
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: "I'd be happy to show you other tutors! What programming language or topic are you looking for?",
            },
          ]);
          setIsLoading(false);
          return;
        }

        // Fetch all matching tutors
        console.log('Fetching other tutors with criteria:', searchCriteria);
        const response = await fetch('/api/tutors/match-all', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(searchCriteria),
        });

        console.log('Response status:', response.status, response.ok);
        
        if (response.ok) {
          const allMatches = await response.json();
          console.log('All matches received:', allMatches?.length, allMatches);
          
          if (!allMatches || !Array.isArray(allMatches) || allMatches.length === 0) {
            setMessages((prev) => [
              ...prev,
              {
                role: 'assistant',
                content: "I couldn't find any other tutors matching your criteria. Would you like to try a different search?",
              },
            ]);
          } else {
            // Filter out the current match if we have one
            const filteredMatches = pendingMatch 
              ? allMatches.filter((match: MatchTutorResponse) => match.tutor.id !== pendingMatch.tutor.id)
              : allMatches;
            
            console.log('Filtered matches (excluding current):', filteredMatches.length);
            
            if (filteredMatches.length === 0) {
              setMessages((prev) => [
                ...prev,
                {
                  role: 'assistant',
                  content: "That's the only tutor available for your criteria. Would you like to try a different search?",
                },
              ]);
            } else {
              // Format all tutors with their availability
              const tutorsList = filteredMatches.map((match: MatchTutorResponse, index: number) => {
                const slots = match.availableSlots && match.availableSlots.length > 0
                  ? match.availableSlots.map(s => `  • ${s.day} at ${s.time} (${s.mode})`).join('\n')
                  : '  • No specific availability listed';
                return `${index + 1}. **${match.tutor.name}**${match.tutor.pronouns ? ` (${match.tutor.pronouns})` : ''}\n   ${match.tutor.bio}\n   Skills: ${match.tutor.skills.join(', ')}\n   Available:\n${slots}`;
              }).join('\n\n');

              // Store the list of available tutors for selection
              setAvailableTutorsList(filteredMatches);
              
              setMessages((prev) => [
                ...prev,
                {
                  role: 'assistant',
                  content: `Here are **${filteredMatches.length} other tutor(s)** available for ${searchCriteria.skill}:\n\n${tutorsList}\n\nWould you like to book a session with any of these tutors? Just let me know which one!`,
                },
              ]);
            }
          }
        } else {
          let errorText = '';
          try {
            errorText = await response.text();
            const errorData = JSON.parse(errorText);
            console.error('Error fetching other tutors:', response.status, errorData);
          } catch (e) {
            console.error('Error fetching other tutors:', response.status, errorText);
          }
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: `I couldn't fetch other tutors right now (${response.status}). Please try again or ask for a specific tutor.`,
            },
          ]);
        }
        setIsLoading(false);
        return;
      }

      // Check if user is selecting a tutor by name
      // Only check if we have available tutors and user message doesn't contain "other" keywords
      if ((availableTutorsList.length > 0 || pendingMatch) && !otherTutorsPattern.test(userMessage)) {
        // Get all possible tutor names from available list and pending match
        const allTutorNames: string[] = [];
        if (pendingMatch) {
          allTutorNames.push(pendingMatch.tutor.name);
        }
        availableTutorsList.forEach(match => {
          allTutorNames.push(match.tutor.name);
        });

        // Check if user message contains a tutor name (with word boundaries to avoid false matches)
        const selectedTutorName = allTutorNames.find(name => {
          // Match full name or first name as whole words
          const nameParts = name.split(' ');
          const firstName = nameParts[0];
          const lastName = nameParts[nameParts.length - 1];
          
          // Use word boundaries to match whole words only
          const fullNameRegex = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
          const firstNameRegex = new RegExp(`\\b${firstName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
          const lastNameRegex = nameParts.length > 1 
            ? new RegExp(`\\b${lastName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
            : null;
          
          return fullNameRegex.test(userMessage) ||
                 firstNameRegex.test(userMessage) ||
                 (lastNameRegex && lastNameRegex.test(userMessage));
        });

        if (selectedTutorName) {
          // Find the tutor match
          let selectedMatch: MatchTutorResponse | null = null;
          
          if (pendingMatch && (pendingMatch.tutor.name === selectedTutorName || pendingMatch.tutor.name.split(' ')[0] === selectedTutorName.split(' ')[0])) {
            selectedMatch = pendingMatch;
          } else {
            selectedMatch = availableTutorsList.find(match => 
              match.tutor.name === selectedTutorName || 
              match.tutor.name.split(' ')[0] === selectedTutorName.split(' ')[0]
            ) || null;
          }

          if (selectedMatch) {
            // Set as pending match and show time slots
            setPendingMatch(selectedMatch);
            setAvailableTutorsList([]); // Clear the list since we've selected
            
            const slots = selectedMatch.availableSlots.map(s => `- ${s.day} at ${s.time} (${s.mode})`).join('\n');
            
            setMessages((prev) => [
              ...prev,
              {
                role: 'assistant',
                content: `Great choice! ${selectedMatch.tutor.name} is available. Here are their available time slots:\n\n${slots}\n\nWhich time slot would you like to book? Just let me know the day and time (e.g., "Wednesday at 10:00" or "Wednesday 10:00-10:30").`,
              },
            ]);
            setIsLoading(false);
            return;
          }
        }
      }

      // Check if user is selecting a time slot for a pending match
      if (pendingMatch && !bookingInfo) {
        // Extract day and time from message
        const dayMatch = userMessage.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i);
        const timeMatch = userMessage.match(/\b(\d{1,2}:\d{2}(?:-\d{1,2}:\d{2})?)\b/);
        
        if (dayMatch && timeMatch) {
          const selectedDay = dayMatch[1].charAt(0).toUpperCase() + dayMatch[1].slice(1).toLowerCase();
          const selectedTime = timeMatch[1];
          
          // Find matching slot
          const matchingSlot = pendingMatch.availableSlots.find(slot => 
            slot.day.toLowerCase() === selectedDay.toLowerCase() &&
            slot.time.includes(selectedTime.split('-')[0]) // Match start time
          );

          if (matchingSlot) {
            // Start booking flow
            setBookingInfo({
              studentName: '',
              studentEmail: '',
              ccsfEmail: '',
              slot: {
                day: matchingSlot.day,
                time: matchingSlot.time,
                mode: matchingSlot.mode,
              },
              step: 'name-email',
            });
            
            setMessages((prev) => [
              ...prev,
              {
                role: 'assistant',
                content: `Perfect! I'll book ${matchingSlot.day} at ${matchingSlot.time} (${matchingSlot.mode}) with ${pendingMatch.tutor.name}.\n\n**Step 1/7:** Please provide:\n- Your name\n- Your school email (ends with @mail.ccsf.edu)\n\nFormat: "Name: [Your Name], Email: [Your @mail.ccsf.edu Email]"`,
              },
            ]);
            setIsLoading(false);
            return;
          } else {
            setMessages((prev) => [
              ...prev,
              {
                role: 'assistant',
                content: `I couldn't find that time slot. Here are ${pendingMatch.tutor.name}'s available slots:\n\n${pendingMatch.availableSlots.map(s => `- ${s.day} at ${s.time} (${s.mode})`).join('\n')}\n\nPlease select one of these times.`,
              },
            ]);
            setIsLoading(false);
            return;
          }
        }
      }

      // Regular tutor matching flow
      // Extract skill from user message (simple extraction)
      const skillMatch = userMessage.match(/\b(python|java|javascript|react|html|css|linux|sql|c\+\+|mips|assembly|debugging)\b/i);
      // Capitalize first letter for consistency (Python, Java, etc.)
      const skill = skillMatch ? skillMatch[1].charAt(0).toUpperCase() + skillMatch[1].slice(1).toLowerCase() : userMessage;

      // Extract day if mentioned
      const dayMatch = userMessage.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i);
      const day = dayMatch ? dayMatch[1] : undefined;

      // Extract time if mentioned
      const timeMatch = userMessage.match(/\b(\d{1,2}:\d{2})\b/);
      const time = timeMatch ? timeMatch[1] : undefined;

      // Extract mode if mentioned
      const modeMatch = userMessage.match(/\b(online|on campus|on-campus)\b/i);
      const mode = modeMatch
        ? modeMatch[1].toLowerCase().replace('-', ' ') === 'online'
          ? 'online'
          : 'on campus'
        : undefined;

      // Ensure skill is capitalized for consistency
      const capitalizedSkill = skill.charAt(0).toUpperCase() + skill.slice(1).toLowerCase();
      
      const matchRequest: MatchTutorRequest = {
        skill: capitalizedSkill,
        day,
        time,
        mode: mode as 'online' | 'on campus' | undefined,
      };

      // Store search criteria for "other tutors" requests
      setLastSearchCriteria(matchRequest);

      const response = await fetch('/api/match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(matchRequest),
      });

      if (!response.ok) {
        throw new Error('Failed to match tutor');
      }

      const matchResult: MatchTutorResponse = await response.json();
      setPendingMatch(matchResult); // Store for booking confirmation
      setAvailableTutorsList([matchResult]); // Store for tutor selection

      const assistantMessage: Message = {
        role: 'assistant',
        content: `I found a great match for you! ${matchResult.tutor.name} is available. ${matchResult.reasoning}\n\nAvailable time slots:\n${matchResult.availableSlots.map(s => `- ${s.day} at ${s.time} (${s.mode})`).join('\n')}\n\nWould you like to book a session? Or ask "show me other tutors" to see more options.`,
        tutorMatch: matchResult,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error:', error);
      
      // Provide helpful error message with examples
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Check if it's a skill-related error
      if (errorMessage.includes('Skill is required') || errorMessage.includes('match')) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: "I'd be happy to help you find a tutor! 😊\n\n**What programming language or topic do you need help with?**\n\n💡 **Examples:**\n• \"I need help with Python\"\n• \"Looking for a Java tutor\"\n• \"Help with JavaScript and React\"\n• \"Python tutor available Monday\"\n• \"C++ help, online sessions\"\n\nJust tell me what you're working on, and I'll find the perfect tutor for you!",
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: "I'm sorry, I couldn't process that. 😔\n\n**How can I help you?**\n\nTry asking about:\n• A programming language (Python, Java, JavaScript, etc.)\n• A specific topic (data structures, debugging, web development)\n• Your preferred day/time for tutoring\n• Online or on-campus sessions\n\n**Example:** \"I need help with Python on Monday afternoon\"",
          },
        ]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-lg shadow-lg border border-gray-200">
      {/* Chat Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <h3 className="text-lg font-semibold text-gray-900">Scheduling Assistant</h3>
        <p className="text-sm text-gray-600">Ask me to find a tutor for you</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map((message, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                {message.tutorMatch && (
                  <div className="mt-2 pt-2 border-t border-gray-300">
                    <p className="text-xs font-semibold">Matched Tutor:</p>
                    <p className="text-xs">{message.tutorMatch.tutor.name}</p>
                    <p className="text-xs text-gray-600">
                      Match Score: {Math.round(message.tutorMatch.matchScore * 100)}%
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-2">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g., I need help with Python on Monday..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}

