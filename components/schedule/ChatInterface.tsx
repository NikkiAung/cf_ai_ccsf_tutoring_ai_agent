'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { MatchTutorRequest, MatchTutorResponse, Message, BookSessionResponse } from '@/types';
import { ChatSessionClient, getSessionId } from '@/lib/chat-session-client';

const INITIAL_MESSAGE: Message = {
  role: 'assistant',
  content: "Hi! 👋 I'm your AI scheduling assistant for the CCSF CS Tutor Squad.\n\nI can help you:\n• Find the perfect tutor for your programming needs\n• Automatically book tutoring sessions\n• Match you with tutors based on your schedule and preferences\n\n**What programming languages or topics do you need help with?**\n\n💡 **Example prompts:**\n• \"I need help with Python\"\n• \"Looking for a Java tutor on Monday\"\n• \"Help with JavaScript, available Tuesday afternoon\"\n• \"Python tutor, online sessions preferred\"",
};

export default function ChatInterface() {
  // Memoize sessionId and sessionClient to prevent recreating on every render
  const sessionId = useMemo(() => getSessionId(), []);
  const sessionClient = useMemo(() => new ChatSessionClient(sessionId), [sessionId]);
  
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
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
  const [isLoadingState, setIsLoadingState] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSavingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = (force: boolean = false) => {
    // Throttle scrolling to avoid excessive scrolls during streaming
    if (!force && scrollTimeoutRef.current) {
      return; // Already scheduled
    }

    scrollTimeoutRef.current = setTimeout(() => {
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        if (messagesEndRef.current) {
          // Scroll the messages container to bottom
          const messagesContainer = messagesEndRef.current.parentElement;
          if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
          } else {
            // Fallback to scrollIntoView
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
          }
        }
        scrollTimeoutRef.current = null;
      });
    }, force ? 0 : 100); // Throttle to 100ms unless forced
  };

  // Load state from Durable Objects on mount (only once)
  useEffect(() => {
    let isMounted = true;
    
    async function loadState() {
      try {
        const state = await sessionClient.getState();
        if (!isMounted) return; // Component unmounted, don't update state
        
        if (state) {
          // Restore messages
          if (state.messages && state.messages.length > 0) {
            setMessages(state.messages);
          } else {
            // No messages in state, use initial message
            setMessages([INITIAL_MESSAGE]);
          }
          // Restore pending match
          if (state.pendingMatch) {
            setPendingMatch(state.pendingMatch);
          }
          // Restore search criteria
          if (state.lastSearchCriteria) {
            setLastSearchCriteria(state.lastSearchCriteria);
          }
          // Restore available tutors
          if (state.availableTutorsList && state.availableTutorsList.length > 0) {
            setAvailableTutorsList(state.availableTutorsList);
          }
          // Restore booking info
          if (state.bookingInfo) {
            setBookingInfo(state.bookingInfo);
          }
        } else {
          // Try loading just messages
          const savedMessages = await sessionClient.getMessages();
          if (!isMounted) return;
          
          if (savedMessages && savedMessages.length > 0) {
            setMessages(savedMessages);
          } else {
            // No saved messages, use initial message
            setMessages([INITIAL_MESSAGE]);
          }
        }
      } catch (error) {
        console.error('Error loading chat state:', error);
      } finally {
        if (isMounted) {
          setIsLoadingState(false);
        }
      }
    }
    
    // Only load once on mount
    if (isLoadingState) {
      loadState();
    }
    
    return () => {
      isMounted = false;
    };
  }, []); // Empty deps - only run once on mount

  // Save state to Durable Objects when it changes (with debounce to prevent infinite loops)
  useEffect(() => {
    // Skip save if still loading initial state
    if (isLoadingState) {
      return;
    }
    
    // Skip save if already saving
    if (isSavingRef.current) {
      return;
    }

    // Clear any pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce saves to prevent infinite loops (wait 1000ms after last change)
    saveTimeoutRef.current = setTimeout(async () => {
      // Double-check we're not already saving
      if (isSavingRef.current || isLoadingState) return;
      
      isSavingRef.current = true;
      try {
        await sessionClient.updateState({
          messages,
          pendingMatch,
          lastSearchCriteria,
          availableTutorsList,
          bookingInfo,
        });
      } catch (error) {
        console.error('Error saving chat state:', error);
      } finally {
        isSavingRef.current = false;
      }
    }, 1000); // Debounce by 1000ms (1 second)

    // Cleanup on unmount or when dependencies change
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, [messages, pendingMatch, lastSearchCriteria, availableTutorsList, bookingInfo, isLoadingState]); // Removed sessionClient from deps

  // Scroll to bottom when messages change (with slight delay to ensure DOM is updated)
  useEffect(() => {
    // Use setTimeout to ensure DOM has updated before scrolling
    const timeoutId = setTimeout(() => {
      scrollToBottom(true); // Force scroll on message changes
    }, 50); // Reduced delay for better responsiveness
    
    return () => {
      clearTimeout(timeoutId);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }
    };
  }, [messages, isLoading]); // Also scroll when loading state changes

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim().toLowerCase();
    const userMessageOriginal = input.trim();
    setInput('');
    
    // Add user message and save to Durable Objects
    const newUserMessage: Message = { role: 'user', content: userMessageOriginal };
    setMessages((prev) => [...prev, newUserMessage]);
    // Don't await - let the useEffect debounced save handle it
    sessionClient.addMessage(newUserMessage).catch(console.error);
    
    setIsLoading(true);

    try {
      // FIRST: Check if user is starting a NEW search (before checking booking flow)
      // Detect if user is asking for a new tutor search (mentions programming language, skill, etc.)
      const newSearchPattern = /\b(python|java|javascript|react|html|css|linux|sql|c\+\+|mips|assembly|debugging|help with|tutor|need help|looking for|find|search)\b/i;
      const isNewSearchRequest = newSearchPattern.test(userMessageOriginal) && 
                                  !userMessage.match(/^(yes|y|no|n|skip|cancel)$/i) &&
                                  !userMessage.match(/name:\s*|email:\s*|my name is/i);
      
      // If user is starting a new search while in booking flow, ask for confirmation
      if (isNewSearchRequest && bookingInfo && bookingInfo.step !== 'complete') {
        const previousSearch = lastSearchCriteria?.skill || pendingMatch?.tutor.skills[0] || 'your previous search';
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `I see you're asking for a new tutor search (${userMessageOriginal}), but we're currently in the middle of booking a session with ${pendingMatch?.tutor.name || 'a tutor'} for ${previousSearch}.\n\n**Are you sure you don't want help with ${previousSearch}?**\n\nIf yes, I'll cancel the current booking and search for tutors matching your new request. If no, we'll continue with the current booking.\n\nPlease reply with "yes" to start the new search, or "no" to continue with the current booking.`,
          },
        ]);
        setIsLoading(false);
        return;
      }
      
      // Handle confirmation response for new search while in booking flow
      if (bookingInfo && bookingInfo.step !== 'complete' && (userMessage === 'yes' || userMessage === 'y')) {
        // Check if this is a confirmation to start new search (context from last message)
        const lastAssistantMessage = messages.filter(m => m.role === 'assistant').pop();
        if (lastAssistantMessage && lastAssistantMessage.content.includes('Are you sure you don\'t want help with')) {
          // User confirmed they want to start new search - find the original search request
          // Look for the most recent user message that contains a search pattern
          const recentUserMessages = messages.filter(m => m.role === 'user').slice(-5).reverse();
          let originalSearchMessage: string | null = null;
          
          for (const msg of recentUserMessages) {
            if (newSearchPattern.test(msg.content)) {
              originalSearchMessage = msg.content;
              break;
            }
          }
          
          // Clear booking state
          setBookingInfo(null);
          setPendingMatch(null);
          setAvailableTutorsList([]);
          
          // If we found the original search, process it now
          if (originalSearchMessage) {
            // Update userMessage to the original search so it gets processed below
            // We'll need to reprocess it, so we'll let it fall through to the tutor matching flow
            // But first, we need to update the current message to the original search
            // Actually, we can't change userMessage here, so we need to manually trigger the search
            // Let's extract the search criteria and process it
            const searchMsg = originalSearchMessage.toLowerCase();
            const skillMatch = searchMsg.match(/\b(python|java|javascript|react|html|css|linux|sql|c\+\+|mips|assembly|debugging)\b/i);
            const skill = skillMatch ? skillMatch[1].charAt(0).toUpperCase() + skillMatch[1].slice(1).toLowerCase() : searchMsg;
            const dayMatch = searchMsg.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i);
            const day = dayMatch ? dayMatch[1] : undefined;
            const timeMatch = searchMsg.match(/\b(\d{1,2}:\d{2})\b/);
            const time = timeMatch ? timeMatch[1] : undefined;
            const modeMatch = searchMsg.match(/\b(online|on campus|on-campus)\b/i);
            const mode = modeMatch
              ? modeMatch[1].toLowerCase().replace('-', ' ') === 'online'
                ? 'online'
                : 'on campus'
              : undefined;
            
            const capitalizedSkill = skill.charAt(0).toUpperCase() + skill.slice(1).toLowerCase();
            const matchRequest: MatchTutorRequest = {
              skill: capitalizedSkill,
              day,
              time,
              mode: mode as 'online' | 'on campus' | undefined,
            };
            
            // Process the search (we'll need to continue to the tutor matching flow below)
            // For now, set lastSearchCriteria and let the flow continue
            setLastSearchCriteria(matchRequest);
            
            // Continue to process the search below by not returning here
            // We'll need to modify userMessageOriginal to be the original search
            // Actually, we can't do that, so we need to manually call the match API
            // Let's do that here
            try {
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
              setPendingMatch(matchResult);
              setAvailableTutorsList([matchResult]);

              // Use streaming for the response
              const assistantMessage: Message = {
                role: 'assistant',
                content: '',
                tutorMatch: matchResult,
              };
              
              setMessages((prev) => [...prev, assistantMessage]);
              
              const chatHistory = messages.map(m => ({
                role: m.role,
                content: m.content,
              }));
              
              const tutorMatchPrompt = `A student asked for help with ${Array.isArray(matchRequest.skill) ? matchRequest.skill.join(', ') : matchRequest.skill}. 
I found a great match: ${matchResult.tutor.name}. 
${matchResult.reasoning}

Available time slots:
${matchResult.availableSlots.map(s => `- ${s.day} at ${s.time} (${s.mode})`).join('\n')}

Please generate a friendly, natural response to tell the student about this match. Include the tutor name, reasoning, available slots, and ask if they'd like to book or see other tutors.`;
              
              const streamResponse = await fetch('/api/chat/stream', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  message: tutorMatchPrompt,
                  chatHistory,
                }),
              });

              if (streamResponse.ok && streamResponse.body) {
                const reader = streamResponse.body.getReader();
                const decoder = new TextDecoder();
                let accumulatedContent = '';
                let lastScrollLength = 0;

                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;

                  const chunk = decoder.decode(value, { stream: true });
                  const lines = chunk.split('\n');

                  for (const line of lines) {
                    if (line.startsWith('data: ')) {
                      try {
                        const data = JSON.parse(line.slice(6));
                        if (data.content) {
                          accumulatedContent += data.content;
                          setMessages((prev) => {
                            const updated = [...prev];
                            if (updated.length > 0 && updated[updated.length - 1].role === 'assistant' && updated[updated.length - 1].tutorMatch) {
                              updated[updated.length - 1] = {
                                ...updated[updated.length - 1],
                                content: accumulatedContent,
                                tutorMatch: matchResult,
                              };
                            }
                            return updated;
                          });
                          if (accumulatedContent.length - lastScrollLength >= 10) {
                            scrollToBottom();
                            lastScrollLength = accumulatedContent.length;
                          }
                        }
                        if (data.done) {
                          scrollToBottom(true);
                          break;
                        }
                      } catch (e) {
                        // Skip invalid JSON
                      }
                    }
                  }
                }
              }
              
              setIsLoading(false);
              return;
            } catch (error) {
              console.error('Error processing new search:', error);
              // Fall through to regular error handling
            }
          }
        }
      }
      
      // Handle "no" response to continue with current booking
      if (bookingInfo && bookingInfo.step !== 'complete' && (userMessage === 'no' || userMessage === 'n')) {
        const lastAssistantMessage = messages.filter(m => m.role === 'assistant').pop();
        if (lastAssistantMessage && lastAssistantMessage.content.includes('Are you sure you don\'t want help with')) {
          // User wants to continue with current booking - show current step prompt
          const currentStep = bookingInfo.step;
          let continueMessage = '';
          
          if (currentStep === 'name-email') {
            continueMessage = `Great! Let's continue with your booking. **Step 1/7:** Please provide:\n- Your name\n- Your school email (ends with @mail.ccsf.edu)\n\nFormat: "Name: [Your Name], Email: [Your @mail.ccsf.edu Email]"`;
          } else if (currentStep === 'ccsf-email') {
            continueMessage = `**Step 2/7:** What is your @mail.ccsf.edu email address? (Please include this, even if it's the same as the email above)`;
          } else if (currentStep === 'student-id') {
            continueMessage = `**Step 2/6:** What is your CCSF student ID number?\n\n**Format:** Letter(s) followed by digits (e.g., S12345678)\n\nYou can skip this by typing "skip"`;
          } else if (currentStep === 'allow-others') {
            continueMessage = `**Step ${bookingInfo.ccsfEmail === bookingInfo.studentEmail ? '3' : '4'}/7:** Are you okay with other students joining during your session? Please reply with "yes" or "no".`;
          } else if (currentStep === 'classes') {
            continueMessage = `**Step ${bookingInfo.ccsfEmail === bookingInfo.studentEmail ? '4' : '5'}/7:** What classes are you seeking help for? Please check all that apply! (e.g., "110A, 131B")`;
          } else if (currentStep === 'specific-help') {
            continueMessage = `**Step ${bookingInfo.ccsfEmail === bookingInfo.studentEmail ? '5' : '6'}/7:** What specifically do you need help with? (e.g., "A programming assignment on nested loops")\n\nPlease don't copy/paste code here.`;
          } else if (currentStep === 'additional-notes') {
            continueMessage = `**Step ${bookingInfo.ccsfEmail === bookingInfo.studentEmail ? '6' : '7'}/7:** Anything else the tutor should know? (Type "no" or "skip" if nothing)`;
          }
          
          if (continueMessage) {
            setMessages((prev) => [
              ...prev,
              {
                role: 'assistant',
                content: continueMessage,
              },
            ]);
            setIsLoading(false);
            return;
          }
        }
      }
      
      // If user confirmed cancel, clear booking and proceed with new search
      if ((userMessage === 'cancel' || userMessage.includes('new search') || userMessage.includes('start over')) && bookingInfo) {
        setBookingInfo(null);
        setPendingMatch(null);
        setAvailableTutorsList([]);
        // Continue to process as new search below (skip booking confirmation check)
      }
      
      // If user wants to continue booking, don't process as new search
      if ((userMessage === 'continue' || userMessage.includes('keep booking')) && bookingInfo) {
        // Let it fall through to booking flow handling below (skip new search and booking confirmation)
      } else if (isNewSearchRequest && !bookingInfo) {
        // Clear any previous state when starting a new search
        setBookingInfo(null);
        setPendingMatch(null);
        setAvailableTutorsList([]);
        // Continue to process as new search below (will be handled by the regular tutor matching flow)
        // Skip booking confirmation check by not returning here
      }
      
      // Check if user is confirming a booking
      // IMPORTANT: Skip this if user just canceled or is starting a new search
      // IMPORTANT: If availableTutorsList has tutors, check the conversation context to determine which tutor
      // This handles the case where user says "yes" after seeing other tutors
      // Use LangChain to better understand context if we have multiple tutors
      if (!isNewSearchRequest && 
          !userMessage.match(/^(cancel|new search|start over)$/i) &&
          (pendingMatch || availableTutorsList.length > 0) && 
          (userMessage === 'yes' || userMessage === 'y' || userMessage.includes('book') || userMessage.includes('confirm'))) {
        // Determine which tutor the user wants to book with
        let selectedTutor: MatchTutorResponse | null = null;
        
        // First, check if there's only one tutor in availableTutorsList (most recent shown)
        if (availableTutorsList.length === 1) {
          // User said "yes" after seeing one tutor - use that one
          selectedTutor = availableTutorsList[0];
          setPendingMatch(selectedTutor); // Update pendingMatch
          setAvailableTutorsList([]); // Clear the list
        } else if (availableTutorsList.length > 1) {
          // Multiple tutors shown - use LangChain to understand context better
          // First, try to find which tutor was mentioned in the last assistant message
          const lastAssistantMessage = messages.filter(m => m.role === 'assistant').pop();
          let foundTutor: MatchTutorResponse | null = null;
          
          if (lastAssistantMessage) {
            // Check which tutor names appear in the last message
            // Prioritize tutors mentioned later in the message (more recent)
            const messageContent = lastAssistantMessage.content;
            let lastIndex = -1;
            
            for (const match of availableTutorsList) {
              const tutorNameIndex = messageContent.lastIndexOf(match.tutor.name);
              if (tutorNameIndex > lastIndex) {
                lastIndex = tutorNameIndex;
                foundTutor = match;
              }
            }
          }
          
          if (foundTutor) {
            selectedTutor = foundTutor;
            setPendingMatch(selectedTutor);
            setAvailableTutorsList([]);
          } else {
            // If we can't determine from message content, use the FIRST tutor in the list
            // (This is typically the best match from the search)
            if (availableTutorsList.length > 0) {
              const firstTutor = availableTutorsList[0];
              selectedTutor = firstTutor;
              setPendingMatch(firstTutor);
              setAvailableTutorsList([]);
              
              // Ask user to confirm which tutor they want
              setMessages((prev) => [
                ...prev,
                {
                  role: 'assistant',
                  content: `I see multiple tutors available. I'll book with **${firstTutor.tutor.name}** (the best match). If you'd like a different tutor, just let me know their name!\n\n**Step 1/7:** Please provide:\n- Your name\n- Your school email (ends with @mail.ccsf.edu)\n\nFormat: "Name: [Your Name], Email: [Your @mail.ccsf.edu Email]"`,
                },
              ]);
              setIsLoading(false);
              return;
            }
          }
        } else if (pendingMatch) {
          // No availableTutorsList, use pendingMatch
          selectedTutor = pendingMatch;
        }
        
        if (!selectedTutor) {
          // No tutor selected, ask for clarification
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: "I'd be happy to help you book a session! Which tutor would you like to book with? Please let me know their name.",
            },
          ]);
          setIsLoading(false);
          return;
        }
        
        // User wants to book - start collecting details
        const firstSlot = selectedTutor.availableSlots[0];
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
            content: `Great! To book a session with ${selectedTutor.tutor.name} on ${firstSlot.day} at ${firstSlot.time} (${firstSlot.mode}), I'll need some information:\n\n**Step 1/7:** Please provide:\n- Your name\n- Your school email (ends with @mail.ccsf.edu)\n\nFormat: "Name: [Your Name], Email: [Your @mail.ccsf.edu Email]"`,
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
                  content: `Thanks! **Step 2/6:** What is your CCSF student ID number?\n\n**Format:** Letter(s) followed by digits (e.g., S12345678)\n\nYou can skip this by typing "skip"`,
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
                content: `**Step 3/7:** What is your CCSF student ID number?\n\n**Format:** Letter(s) followed by digits (e.g., S12345678)\n\nYou can skip this by typing "skip"`,
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
            
            // Validate CCSF student ID format: character(s) + digits (e.g., S12345678)
            // Format: 1-3 letters followed by 6-10 digits
            const studentIdPattern = /^[A-Za-z]{1,3}\d{6,10}$/;
            
            if (!studentIdPattern.test(studentId)) {
              // Invalid format - ask again
              setMessages((prev) => [
                ...prev,
                {
                  role: 'assistant',
                  content: `❌ Invalid student ID format. Please enter your CCSF student ID in the correct format.\n\n**Format:** Letter(s) followed by digits (e.g., S12345678)\n\n**Examples:**\n• S12345678\n• A98765432\n• CS123456\n\nPlease try again, or type "skip" to skip this step.`,
                },
              ]);
              setIsLoading(false);
              return;
            }
            
            // Valid student ID - proceed
            setBookingInfo({ ...bookingInfo, studentId: studentId.toUpperCase(), step: 'allow-others' });
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

          const bookResult = await bookResponse.json() as BookSessionResponse;
          
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
      // Also matches questions like "is it the only one?", "what about other tutors?", etc.
      const otherTutorsPattern = /(other|more|else|another|different|show me|list|all|who else|anyone else|any other|is it the only|are there more|are there other|what about|anyone else|any other options)/i;
      if (otherTutorsPattern.test(userMessage)) {
        // ALWAYS try to extract skill from current message first (user might specify a different skill)
        // Use userMessageOriginal to preserve case for better matching
        const skillMatch = userMessageOriginal.match(/\b(python|java|javascript|react|html|css|linux|sql|c\+\+|mips|assembly|debugging)\b/i);
        let searchCriteria: MatchTutorRequest | null = null;
        
        if (skillMatch) {
          // User specified a skill in their request - use that (prioritize current message)
          const skill = skillMatch[1].charAt(0).toUpperCase() + skillMatch[1].slice(1).toLowerCase();
          const dayMatch = userMessage.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i);
          const day = dayMatch ? dayMatch[1] : (lastSearchCriteria?.day);
          const timeMatch = userMessage.match(/\b(\d{1,2}:\d{2})\b/);
          const time = timeMatch ? timeMatch[1] : (lastSearchCriteria?.time);
          const modeMatch = userMessage.match(/\b(online|on campus|on-campus)\b/i);
          const mode = modeMatch
            ? modeMatch[1].toLowerCase().replace('-', ' ') === 'online'
              ? 'online'
              : 'on campus'
            : (lastSearchCriteria?.mode);
          
          searchCriteria = {
            skill,
            day,
            time,
            mode: mode as 'online' | 'on campus' | undefined,
          };
        } else if (lastSearchCriteria && lastSearchCriteria.skill) {
          // No skill in current message, but we have lastSearchCriteria - use that
          console.log('📋 Using lastSearchCriteria:', lastSearchCriteria);
          searchCriteria = {
            ...lastSearchCriteria,
            // Clear day/time/mode filters for "other tutors" search (just search by skill)
            day: undefined,
            time: undefined,
            mode: undefined,
          };
        } else if (pendingMatch) {
          // No skill in message and no lastSearchCriteria - use the skill from the last match
          // Extract skill from the matched tutor's skills
          // Try to find a programming language skill first (prioritize over Debugging, etc.)
          const programmingSkills = ['Python', 'Java', 'JavaScript', 'C++', 'React', 'HTML', 'CSS', 'Linux', 'SQL', 'MIPS Assembly'];
          const tutorSkill = pendingMatch.tutor.skills.find(s => 
            programmingSkills.includes(s)
          ) || pendingMatch.tutor.skills[0] || 'Python';
          
          console.log('📋 Using skill from pendingMatch. Tutor skills:', pendingMatch.tutor.skills, 'Selected:', tutorSkill);
          searchCriteria = {
            skill: tutorSkill,
            day: undefined,
            time: undefined,
            mode: undefined,
          };
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
        
        // Ensure we have a valid skill
        if (!searchCriteria.skill) {
          console.warn('⚠️ No skill in searchCriteria, using pendingMatch skills');
          if (pendingMatch && pendingMatch.tutor.skills.length > 0) {
            searchCriteria.skill = pendingMatch.tutor.skills[0];
          } else {
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
        }

        // Fetch all matching tutors
        console.log('🔍 [OTHER TUTORS] Fetching with criteria:', JSON.stringify(searchCriteria, null, 2));
        console.log('📋 [OTHER TUTORS] Current pendingMatch:', pendingMatch?.tutor.name, pendingMatch?.tutor.id, 'Skills:', pendingMatch?.tutor.skills);
        console.log('📋 [OTHER TUTORS] lastSearchCriteria:', lastSearchCriteria);
        
        const response = await fetch('/api/tutors/match-all', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(searchCriteria),
        });

        console.log('📡 Response status:', response.status, response.ok);
        
        if (response.ok) {
          const allMatches = await response.json() as MatchTutorResponse[];
          console.log('✅ All matches received:', allMatches?.length);
          console.log('📝 Match details:', allMatches.map(m => ({ name: m.tutor.name, id: m.tutor.id, skills: m.tutor.skills })));
          
          if (!allMatches || !Array.isArray(allMatches) || allMatches.length === 0) {
            console.warn('⚠️ No matches found from API');
            // If API returned no results but we have a pendingMatch, confirm that tutor is the only one
            if (pendingMatch && searchCriteria.skill) {
              setMessages((prev) => [
                ...prev,
                {
                  role: 'assistant',
                  content: `I apologize, but **${pendingMatch.tutor.name}** is the only tutor available for ${searchCriteria.skill}. Would you like to book a session with ${pendingMatch.tutor.name}, or would you like to search for a different topic?`,
                },
              ]);
            } else {
              setMessages((prev) => [
                ...prev,
                {
                  role: 'assistant',
                  content: "I couldn't find any tutors matching your criteria. Would you like to try a different search?",
                },
              ]);
            }
          } else {
            // Filter out the current match if we have one
            const beforeFilter = allMatches.length;
            const filteredMatches = pendingMatch 
              ? allMatches.filter((match: MatchTutorResponse) => {
                  const isDifferent = match.tutor.id !== pendingMatch.tutor.id;
                  if (!isDifferent) {
                    console.log(`🚫 Filtering out current match: ${match.tutor.name} (ID: ${match.tutor.id})`);
                  }
                  return isDifferent;
                })
              : allMatches;
            
            console.log(`🔍 Filtered matches: ${beforeFilter} → ${filteredMatches.length} (excluding current match)`);
            console.log('📋 Remaining tutors:', filteredMatches.map(m => m.tutor.name));
            
            if (filteredMatches.length === 0) {
              console.warn('⚠️ All matches were filtered out (only current match available)');
              // Check if there were any matches before filtering
              if (allMatches.length > 0 && pendingMatch) {
                // Only one tutor found (the current one) - confirm this
                setMessages((prev) => [
                  ...prev,
                  {
                    role: 'assistant',
                    content: `Yes, **${pendingMatch.tutor.name}** is the only tutor available for ${searchCriteria.skill}. Would you like to book a session with ${pendingMatch.tutor.name}, or would you like to search for a different topic?`,
                  },
                ]);
              } else {
                // No matches found, but we have a pendingMatch - confirm they're the only one
                if (pendingMatch && searchCriteria.skill) {
                  setMessages((prev) => [
                    ...prev,
                    {
                      role: 'assistant',
                      content: `I apologize, but **${pendingMatch.tutor.name}** is the only tutor available for ${searchCriteria.skill}. Would you like to book a session with ${pendingMatch.tutor.name}, or would you like to search for a different topic?`,
                    },
                  ]);
                } else {
                  setMessages((prev) => [
                    ...prev,
                    {
                      role: 'assistant',
                      content: `I couldn't find any other tutors for ${searchCriteria.skill}. Would you like to try a different search?`,
                    },
                  ]);
                }
              }
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
              
              // If only one tutor is shown, set it as pendingMatch for easier "yes" handling
              if (filteredMatches.length === 1) {
                setPendingMatch(filteredMatches[0]);
              }
              
              setMessages((prev) => [
                ...prev,
                {
                  role: 'assistant',
                  content: `Here are **${filteredMatches.length} other tutor(s)** available for ${searchCriteria.skill}:\n\n${tutorsList}\n\nWould you like to book a session with any of these tutors? Just let me know which one, or say "yes" to book with ${filteredMatches.length === 1 ? filteredMatches[0].tutor.name : 'the first one'}!`,
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
      // Special handling for C++ (keep the ++) and JavaScript (capitalize 'S')
      let skill: string;
      if (skillMatch) {
        const matchedSkill = skillMatch[1].toLowerCase();
        if (matchedSkill === 'c++' || matchedSkill === 'c\\+\\+') {
          skill = 'C++';
        } else if (matchedSkill === 'javascript') {
          skill = 'JavaScript'; // Correct capitalization
        } else if (matchedSkill === 'mips') {
          skill = 'MIPS Assembly'; // Full name
        } else {
          skill = matchedSkill.charAt(0).toUpperCase() + matchedSkill.slice(1).toLowerCase();
        }
      } else {
        skill = userMessage;
      }

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
      // Special handling for C++ (preserve as-is) and JavaScript (capitalize 'S')
      let capitalizedSkill: string;
      const skillLower = skill.toLowerCase();
      if (skillLower === 'c++' || skill === 'C++') {
        capitalizedSkill = 'C++';
      } else if (skillLower === 'javascript') {
        capitalizedSkill = 'JavaScript'; // Correct capitalization
      } else if (skillLower === 'mips') {
        capitalizedSkill = 'MIPS Assembly'; // Full name
      } else {
        capitalizedSkill = skill.charAt(0).toUpperCase() + skill.slice(1).toLowerCase();
      }
      
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

      // Use streaming for the response message (Lesson 3 - Streaming mode)
      // Stream the AI-generated response about the tutor match using LangChain
      const assistantMessage: Message = {
        role: 'assistant',
        content: '', // Start with empty content for streaming
        tutorMatch: matchResult,
      };
      
      // Add empty assistant message first
      setMessages((prev) => [...prev, assistantMessage]);
      
      // Stream the AI-generated response using LangChain
      const chatHistory = messages.map(m => ({
        role: m.role,
        content: m.content,
      }));
      
      // Create a prompt for the AI to generate a natural response about the match
      const tutorMatchPrompt = `A student asked for help with ${Array.isArray(matchRequest.skill) ? matchRequest.skill.join(', ') : matchRequest.skill}. 
I found a great match: ${matchResult.tutor.name}. 
${matchResult.reasoning}

Available time slots:
${matchResult.availableSlots.map(s => `- ${s.day} at ${s.time} (${s.mode})`).join('\n')}

Please generate a friendly, natural response to tell the student about this match. Include the tutor name, reasoning, available slots, and ask if they'd like to book or see other tutors.`;
      
      try {
        const streamResponse = await fetch('/api/chat/stream', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: tutorMatchPrompt,
            chatHistory,
          }),
        });

        if (!streamResponse.ok) {
          throw new Error('Failed to stream response');
        }

        const reader = streamResponse.body?.getReader();
        const decoder = new TextDecoder();
        let accumulatedContent = '';
        let lastScrollLength = 0;

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  if (data.content) {
                    accumulatedContent += data.content;
                    // Update the last message with accumulated content
                    setMessages((prev) => {
                      const updated = [...prev];
                      if (updated.length > 0 && updated[updated.length - 1].role === 'assistant' && updated[updated.length - 1].tutorMatch) {
                        updated[updated.length - 1] = {
                          ...updated[updated.length - 1],
                          content: accumulatedContent,
                          tutorMatch: matchResult,
                        };
                      }
                      return updated;
                    });
                    // Scroll to bottom as content streams in (throttled - only scroll every 10 chars)
                    if (accumulatedContent.length - lastScrollLength >= 10) {
                      scrollToBottom();
                      lastScrollLength = accumulatedContent.length;
                    }
                  }
                  if (data.done) {
                    // Force scroll on completion
                    scrollToBottom(true);
                    break;
                  }
                } catch (e) {
                  // Skip invalid JSON lines
                }
              }
            }
          }
        }
      } catch (streamError) {
        // Fallback to non-streaming if streaming fails
        console.warn('Streaming failed, using non-streaming response:', streamError);
        const fallbackMessage: Message = {
          role: 'assistant',
          content: `I found a great match for you! ${matchResult.tutor.name} is available. ${matchResult.reasoning}\n\nAvailable time slots:\n${matchResult.availableSlots.map(s => `- ${s.day} at ${s.time} (${s.mode})`).join('\n')}\n\nWould you like to book a session? Or ask "show me other tutors" to see more options.`,
          tutorMatch: matchResult,
        };
        setMessages((prev) => {
          const updated = [...prev];
          if (updated.length > 0 && updated[updated.length - 1].role === 'assistant') {
            updated[updated.length - 1] = fallbackMessage;
          } else {
            updated.push(fallbackMessage);
          }
          return updated;
        });
      }
    } catch (error) {
      console.error('Error:', error);
      
      // Provide helpful error message with examples
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Use streaming for error responses too
      const errorPrompt = errorMessage.includes('Skill is required') || errorMessage.includes('match')
        ? "I'd be happy to help you find a tutor! 😊\n\n**What programming language or topic do you need help with?**\n\n💡 **Examples:**\n• \"I need help with Python\"\n• \"Looking for a Java tutor\"\n• \"Help with JavaScript and React\"\n• \"Python tutor available Monday\"\n• \"C++ help, online sessions\"\n\nJust tell me what you're working on, and I'll find the perfect tutor for you!"
        : "I'm sorry, I couldn't process that. 😔\n\n**How can I help you?**\n\nTry asking about:\n• A programming language (Python, Java, JavaScript, etc.)\n• A specific topic (data structures, debugging, web development)\n• Your preferred day/time for tutoring\n• Online or on-campus sessions\n\n**Example:** \"I need help with Python on Monday afternoon\"";

      // Add empty assistant message for streaming
      const errorAssistantMessage: Message = {
        role: 'assistant',
        content: '',
      };
      setMessages((prev) => [...prev, errorAssistantMessage]);

      // Stream the error response
      try {
        const chatHistory = messages.map(m => ({
          role: m.role,
          content: m.content,
        }));

        const streamResponse = await fetch('/api/chat/stream', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: errorPrompt,
            chatHistory,
          }),
        });

        if (streamResponse.ok && streamResponse.body) {
          const reader = streamResponse.body.getReader();
          const decoder = new TextDecoder();
          let accumulatedContent = '';
          let lastScrollLength = 0;

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  if (data.content) {
                    accumulatedContent += data.content;
                    setMessages((prev) => {
                      const updated = [...prev];
                      if (updated.length > 0 && updated[updated.length - 1].role === 'assistant' && !updated[updated.length - 1].tutorMatch) {
                        updated[updated.length - 1] = {
                          ...updated[updated.length - 1],
                          content: accumulatedContent,
                        };
                      }
                      return updated;
                    });
                    // Throttle scrolling - only scroll every 10 characters
                    if (accumulatedContent.length - lastScrollLength >= 10) {
                      scrollToBottom();
                      lastScrollLength = accumulatedContent.length;
                    }
                  }
                  if (data.done) {
                    scrollToBottom(true);
                    break;
                  }
                } catch (e) {
                  // Skip invalid JSON
                }
              }
            }
          }
        } else {
          // Fallback to non-streaming
          setMessages((prev) => {
            const updated = [...prev];
            if (updated.length > 0 && updated[updated.length - 1].role === 'assistant' && !updated[updated.length - 1].content) {
              updated[updated.length - 1] = {
                role: 'assistant',
                content: errorPrompt,
              };
            }
            return updated;
          });
        }
      } catch (streamError) {
        // Fallback to non-streaming
        setMessages((prev) => {
          const updated = [...prev];
          if (updated.length > 0 && updated[updated.length - 1].role === 'assistant' && !updated[updated.length - 1].content) {
            updated[updated.length - 1] = {
              role: 'assistant',
              content: errorPrompt,
            };
          }
          return updated;
        });
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

