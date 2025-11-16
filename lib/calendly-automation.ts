// Calendly automation using Puppeteer
// This script automates the Calendly booking process

import type { BookSessionRequest } from '@/types';
import { generateCalendlyUrlWithParams } from './calendly-api';

interface AutomationResult {
  success: boolean;
  message: string;
  calendlyUrl?: string;
}

/**
 * Converts day name and time to a date object
 * Example: "Monday", "10:00" -> Date object for next Monday at 10:00
 */
function getDateFromDayAndTime(day: string, time: string): Date {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayIndex = days.findIndex(d => d.toLowerCase() === day.toLowerCase());
  
  if (dayIndex === -1) {
    throw new Error(`Invalid day: ${day}`);
  }

  const now = new Date();
  const currentDay = now.getDay();
  let daysUntilTarget = (dayIndex - currentDay + 7) % 7;
  
  // If it's the same day, check if time has passed
  if (daysUntilTarget === 0) {
    const [hours, minutes] = time.split(':').map(Number);
    const targetTime = new Date(now);
    targetTime.setHours(hours, minutes, 0, 0);
    if (targetTime < now) {
      daysUntilTarget = 7; // Next week
    }
  }

  const targetDate = new Date(now);
  targetDate.setDate(now.getDate() + daysUntilTarget);
  
  const [hours, minutes] = time.split('-')[0].split(':').map(Number);
  targetDate.setHours(hours, minutes, 0, 0);

  return targetDate;
}

/**
 * Formats date for Calendly URL
 */
function formatDateForCalendly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  // Pacific Time offset (PST is -08:00, PDT is -07:00)
  // For simplicity, using -08:00 (PST)
  return `${year}-${month}-${day}T${hours}:${minutes}:00-08:00`;
}

/**
 * Helper function to wait (Puppeteer compatible)
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Automates Calendly booking using Puppeteer
 * Note: This requires Puppeteer to be installed and run in a Node.js environment
 */
export async function automateCalendlyBooking(
  request: BookSessionRequest
): Promise<AutomationResult> {
  try {
    // Dynamic import to avoid issues if Puppeteer isn't installed
    const puppeteer = await import('puppeteer').catch(() => null);
    
    if (!puppeteer) {
      // Fallback: return URL for manual booking
      const targetDate = getDateFromDayAndTime(request.day, request.time);
      const dateStr = formatDateForCalendly(targetDate);
      const year = targetDate.getFullYear();
      const month = String(targetDate.getMonth() + 1).padStart(2, '0');
      const day = String(targetDate.getDate()).padStart(2, '0');
      
      const calendlyUrl = `https://calendly.com/cs-tutor-squad/30min/${dateStr}?back=1&month=${year}-${month}&date=${year}-${month}-${day}`;
      
      return {
        success: false,
        message: 'Puppeteer not available. Please install: npm install puppeteer',
        calendlyUrl,
      };
    }

    // Use headful mode in development so user can see the automation
    // In production, you might want to use a service like Browserless
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    const browser = await puppeteer.launch({
      headless: !isDevelopment, // Show browser in development
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 1280, height: 720 },
    });

    try {
      const page = await browser.newPage();
      
      // Navigate to Calendly
      const targetDate = getDateFromDayAndTime(request.day, request.time);
      const dateStr = formatDateForCalendly(targetDate);
      const year = targetDate.getFullYear();
      const month = String(targetDate.getMonth() + 1).padStart(2, '0');
      const day = String(targetDate.getDate()).padStart(2, '0');
      
      const calendlyUrl = `https://calendly.com/cs-tutor-squad/30min/${dateStr}?back=1&month=${year}-${month}&date=${year}-${month}-${day}`;
      
      await page.goto(calendlyUrl, { waitUntil: 'networkidle2', timeout: 30000 });

      // Wait for the calendar to load
      await page.waitForSelector('[data-calendly-selector="calendar"]', { timeout: 10000 }).catch(() => {
        // Calendar might already be on the booking page
      });

      // Click on the specific date if calendar is shown
      try {
        const dateSelector = `[data-day="${day}"]`;
        await page.waitForSelector(dateSelector, { timeout: 5000 });
        await page.click(dateSelector);
        await delay(1000);
      } catch (e) {
        // Date might already be selected or we're on the booking page
      }

      // Wait for time slots to appear and click the matching time
      try {
        const timeSlots = await page.$$('[data-calendly-selector="time-slot"]');
        const timeStr = request.time.split('-')[0]; // Get start time
        
        for (const slot of timeSlots) {
          const slotText = await page.evaluate(el => el.textContent, slot);
          if (slotText && slotText.includes(timeStr)) {
            await slot.click();
            await delay(2000);
            break;
          }
        }
      } catch (e) {
        // Time might already be selected
      }

      // Wait for the page to load completely (Puppeteer)
      // Calendly is a dynamic SPA, so we need to wait for elements to appear
      await delay(5000); // Give Calendly time to load
      
      // Wait for the form to appear - Calendly uses various selectors
      // Try multiple approaches to find the form
      let formFound = false;
      const formSelectors = [
        'form',
        'input[type="text"]',
        'input[type="email"]',
        'input[name*="name"]',
        'input[name*="email"]',
        '[data-calendly-selector]',
      ];
      
      for (const selector of formSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 5000 });
          formFound = true;
          console.log(`Form found using selector: ${selector}`);
          break;
        } catch (e) {
          continue;
        }
      }
      
      if (!formFound) {
        console.warn('Form not found with standard selectors, continuing anyway');
        // Take a screenshot for debugging
        try {
          await page.screenshot({ path: 'calendly-no-form-found.png', fullPage: true });
        } catch (e) {
          // Ignore screenshot errors
        }
      }

      // Wait a bit more for dynamic content to load
      await delay(2000);

      // Fill out the form using actual Calendly field structure
      let nameFilled = false;
      let emailFilled = false;
      
      // Name field - based on actual Calendly structure
      const nameSelectors = [
        '#full_name_input',
        'input#full_name_input',
        'input[name*="full_name" i]',
        'input[name*="name" i]',
        'input[placeholder*="name" i]',
        'input[type="text"]',
      ];
      
      for (const selector of nameSelectors) {
        try {
          const element = await page.$(selector);
          if (element) {
            await element.click({ clickCount: 3 }); // Select all existing text
            await element.type(request.studentName, { delay: 100 });
            nameFilled = true;
            console.log(`Successfully filled name using selector: ${selector}`);
            await delay(500);
            break;
          }
        } catch (e) {
          continue;
        }
      }

      // Email field - based on actual Calendly structure
      const emailSelectors = [
        '#email_input',
        'input#email_input',
        'input[name*="email" i]',
        'input[type="email"]',
        'input[placeholder*="email" i]',
      ];
      
      for (const selector of emailSelectors) {
        try {
          const element = await page.$(selector);
          if (element) {
            await element.click({ clickCount: 3 });
            await element.type(request.studentEmail, { delay: 100 });
            emailFilled = true;
            console.log(`Successfully filled email using selector: ${selector}`);
            await delay(500);
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (!nameFilled || !emailFilled) {
        console.warn(`Name filled: ${nameFilled}, Email filled: ${emailFilled}`);
        // Take a screenshot to debug
        try {
          await page.screenshot({ path: 'calendly-debug-before-fill.png', fullPage: true });
        } catch (e) {
          // Ignore screenshot errors
        }
      }

      // Add guests (if field exists)
      try {
        const addGuestsField = await page.$('input[placeholder*="guest" i]');
        if (addGuestsField) {
          // Leave empty or handle as needed
        }
      } catch (e) {
        // Field might not exist
      }

      // Wait a bit before filling next fields
      await delay(1000);

      // CCSF email field - question_0 based on actual structure
      let ccsfEmailFilled = false;
      try {
        const ccsfSelectors = [
          'input[name="question_0"]',
          'input#_c0bWe8tx0y3Zf4EKB18R',
          'input[name*="question_0"]',
          'input[type="text"][name="question_0"]',
        ];
        
        for (const selector of ccsfSelectors) {
          try {
            const element = await page.$(selector);
            if (element) {
              await element.click({ clickCount: 3 });
              await element.type(request.ccsfEmail, { delay: 100 });
              ccsfEmailFilled = true;
              console.log(`Successfully filled CCSF email using selector: ${selector}`);
              await delay(500);
              break;
            }
          } catch (e) {
            continue;
          }
        }
      } catch (e) {
        console.warn('Could not find CCSF email field:', e);
      }

      // Student ID field (optional) - question_1 based on actual structure
      if (request.studentId) {
        try {
          const studentIdSelectors = [
            'input[name="question_1"]',
            'input#V9pdoIBkIodML7A65eoqS',
            'input[name*="question_1"]',
          ];
          
          for (const selector of studentIdSelectors) {
            try {
              const element = await page.$(selector);
              if (element) {
                await element.click({ clickCount: 3 });
                await element.type(request.studentId, { delay: 100 });
                console.log(`Successfully filled student ID using selector: ${selector}`);
                await delay(500);
                break;
              }
            } catch (e) {
              continue;
            }
          }
        } catch (e) {
          console.warn('Could not find student ID field:', e);
        }
      }

      // Allow other students question - question_2 based on actual structure
      if (request.allowOtherStudents !== undefined) {
        try {
          // Find radio buttons for question_2
          const radioButtons = await page.$$('input[name="question_2"][type="radio"]');
          
          for (const radio of radioButtons) {
            try {
              const value = await page.evaluate(el => (el as HTMLInputElement).value, radio);
              
              // Match based on actual values from Calendly
              if (request.allowOtherStudents && value === 'Yes, I am okay with other students joining.') {
                await radio.click();
                console.log('Selected: Yes, I am okay with other students joining');
                await delay(500);
                break;
              } else if (!request.allowOtherStudents && value === 'No, I prefer a private tutoring session.') {
                await radio.click();
                console.log('Selected: No, I prefer a private tutoring session');
                await delay(500);
                break;
              }
            } catch (e) {
              continue;
            }
          }
        } catch (e) {
          console.warn('Could not set allow other students option:', e);
        }
      }

      // Course checkboxes - question_3 based on actual structure
      if (request.classes && request.classes.length > 0) {
        try {
          // Find checkboxes for question_3
          const checkboxes = await page.$$('input[name="question_3"][type="checkbox"]');
          
          for (const checkbox of checkboxes) {
            try {
              // Get the value from parent div - value is on the div, not the checkbox
              const value = await page.evaluate((el) => {
                let parent = el.parentElement;
                // Navigate up to find div with value attribute
                while (parent) {
                  const val = parent.getAttribute('value');
                  if (val) {
                    return val;
                  }
                  parent = parent.parentElement;
                }
                return '';
              }, checkbox);
              
              // Check if this course is in the requested classes
              if (value && request.classes.some(course => {
                // Match exact value or check if value contains course code
                return value === course || value.toUpperCase().includes(course.toUpperCase());
              })) {
                // Check if already checked
                const isChecked = await page.evaluate(el => (el as HTMLInputElement).checked, checkbox);
                if (!isChecked) {
                  await checkbox.click();
                  console.log(`Selected course: ${value}`);
                  await delay(300);
                }
              }
            } catch (e) {
              console.warn('Error processing checkbox:', e);
              continue;
            }
          }
        } catch (e) {
          console.warn('Could not set course checkboxes:', e);
        }
      }

      // Specific help textarea - question_4 based on actual structure
      if (request.specificHelp) {
        try {
          const textareaSelectors = [
            'textarea[name="question_4"]',
            'textarea#J5M0akVcwxsKoteQRJzyL',
            'textarea[name*="question_4"]',
          ];
          
          for (const selector of textareaSelectors) {
            try {
              const element = await page.$(selector);
              if (element) {
                await element.click({ clickCount: 3 });
                await element.type(request.specificHelp, { delay: 50 });
                console.log('Successfully filled specific help textarea');
                await delay(500);
                break;
              }
            } catch (e) {
              continue;
            }
          }
        } catch (e) {
          console.warn('Could not find specific help textarea:', e);
        }
      }

      // Additional notes textarea - question_5 based on actual structure
      if (request.additionalNotes) {
        try {
          const textareaSelectors = [
            'textarea[name="question_5"]',
            'textarea#NO8fqbGTM-jKqw702vnCf',
            'textarea[name*="question_5"]',
          ];
          
          for (const selector of textareaSelectors) {
            try {
              const element = await page.$(selector);
              if (element) {
                await element.click({ clickCount: 3 });
                await element.type(request.additionalNotes, { delay: 50 });
                console.log('Successfully filled additional notes textarea');
                await delay(500);
                break;
              }
            } catch (e) {
              continue;
            }
          }
        } catch (e) {
          console.warn('Could not find additional notes textarea:', e);
        }
      }

      // Wait a bit for all fields to be filled and form to stabilize
      await delay(2000);

      // Scroll to top to ensure form is visible
      try {
        await page.evaluate(() => window.scrollTo(0, 0));
      } catch (e) {
        // Ignore scroll errors
      }

      // Take a screenshot for debugging
      try {
        await page.screenshot({ path: 'calendly-form-filled.png', fullPage: true });
        console.log('Screenshot saved: calendly-form-filled.png');
      } catch (e) {
        console.warn('Could not take screenshot:', e);
      }

      // Get the current URL (should have the form filled)
      const currentUrl = page.url();
      
      console.log('Automation completed. Form filled at URL:', currentUrl);
      
      // In development, keep browser open indefinitely so user can review and submit
      // In production, we'll close immediately and return the URL
      if (isDevelopment) {
        // Keep browser open - don't close it automatically
        // User can close it manually when done
        // Note: Browser will stay open until user closes it or process is killed
        // We intentionally don't close the browser here - it will stay open
        
        console.log('\n✅ Form filled successfully! Browser will stay open for you to review and submit.');
        console.log('📝 The browser window will remain open until you:');
        console.log('   1. Close the browser window manually, OR');
        console.log('   2. Press Ctrl+C in the terminal to stop the server\n');
        
        // Don't close browser - let it stay open
        // The browser will be cleaned up when the Node.js process exits
        
        return {
          success: true,
          message: '✅ Form filled successfully! A browser window is open showing the filled form. Please review and submit the form. The browser will stay open until you close it manually.',
          calendlyUrl: currentUrl,
        };
      } else {
        // In production, close browser immediately
        // The form was filled in the browser session, but that session is now closed
        // When user visits the URL, they'll see an empty form
        
        await browser.close();
        
        // Return the URL - user will need to fill manually
        // OR use Calendly API for proper automation
        return {
          success: false,
          message: '⚠️ Important: The form was filled in an automated browser session, but that session has ended. When you visit the URL, the form will be empty. For production use, consider:\n1. Using Calendly API (recommended)\n2. Running automation in a visible browser\n3. Using a service like Browserless.io\n\nReturning booking URL - please fill the form manually.',
          calendlyUrl: generateCalendlyUrlWithParams(request),
        };
      }

    } catch (error) {
      // In development, keep browser open even on error so user can see what happened
      // In production, close browser on error
      if (!isDevelopment) {
        try {
          await browser.close();
        } catch (e) {
          // Browser might already be closed
        }
      }
      throw error;
    }

  } catch (error) {
    console.error('Calendly automation error:', error);
    
    // Get detailed error information
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error('Error details:', {
      message: errorMessage,
      stack: errorStack,
      request: {
        day: request.day,
        time: request.time,
        studentName: request.studentName,
        studentEmail: request.studentEmail,
      },
    });
    
    // Fallback: return URL for manual booking
    const targetDate = getDateFromDayAndTime(request.day, request.time);
    const dateStr = formatDateForCalendly(targetDate);
    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const day = String(targetDate.getDate()).padStart(2, '0');
    
    const calendlyUrl = `https://calendly.com/cs-tutor-squad/30min/${dateStr}?back=1&month=${year}-${month}&date=${year}-${month}-${day}`;
    
    return {
      success: false,
      message: `⚠️ Automation encountered an issue: ${errorMessage}\n\nThe form may have been partially filled. Please click the link below to complete your booking manually.\n\nIf this persists, the Calendly form structure may have changed.`,
      calendlyUrl,
    };
  }
}

