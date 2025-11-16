Got it — here are 4 clean, realistic tutor entries formatted for:

✅ Cloudflare D1 (SQL seed)
✅ Frontend-friendly JSON
✅ Ready for AI-matching (skills + availability included)


📌 tutors.sql

INSERT INTO tutors (id, name, pronouns, bio, mode) VALUES
(1, 'Aung Nanda O', 'he/him', 'I also go by Nikki. Extrovert who enjoys helping others succeed. Skilled in Python, Java, JavaScript, React, HTML, CSS.', 'online'),
(2, 'Mei O', 'she/they', 'Aspiring AI & Linguistics researcher. Daily Arch Linux user. Passionate about Python, Linux, and machine learning concepts.', 'online'),
(3, 'Chris H', 'he/him', 'Problem solver and travel enthusiast. Experienced with Python, Java, SQL, JavaScript, CSS, and MIPS assembly.', 'on campus'),
(4, 'Claire C', NULL, 'Second-year CS major. Swimmer, pianist, and board game lover. Excited to tutor programming fundamentals.', 'on campus');

📌 skills.sql

INSERT INTO skills (id, name) VALUES
(1, 'Python'),
(2, 'Java'),
(3, 'JavaScript'),
(4, 'React'),
(5, 'HTML'),
(6, 'CSS'),
(7, 'Linux'),
(8, 'MIPS Assembly'),
(9, 'SQL'),
(10, 'Debugging'),
(11, 'C++');

📌 tutor_skills.sql

INSERT INTO tutor_skills (tutor_id, skill_id) VALUES
-- Aung Nanda O
(1, 1), (1, 2), (1, 3), (1, 4), (1, 5), (1, 6),

-- Mei O
(2, 1), (2, 7), (2, 10),

-- Chris H
(3, 1), (3, 2), (3, 9), (3, 3), (3, 6), (3, 8),

-- Claire C
(4, 1), (4, 11), (4, 10);

📌 availability.sql

Using exact 30-minute blocks (best for Calendly automation later).

INSERT INTO availability (tutor_id, day, time, mode) VALUES

-- Aung Nanda O (online)
(1, 'Monday', '9:30-10:00', 'online'),
(1, 'Wednesday', '4:00-4:30', 'online'),
(1, 'Wednesday', '4:30-5:00', 'online'),

-- Mei O (online)
(2, 'Tuesday', '11:00-11:30', 'online'),
(2, 'Tuesday', '11:30-12:00', 'online'),
(2, 'Thursday', '2:30-3:00', 'online'),

-- Chris H (on campus)
(3, 'Monday', '10:00-10:30', 'on campus'),
(3, 'Monday', '10:30-11:00', 'on campus'),
(3, 'Friday', '11:00-11:30', 'on campus'),

-- Claire C (on campus)
(4, 'Wednesday', '9:30-10:00', 'on campus'),
(4, 'Wednesday', '10:00-10:30', 'on campus'),
(4, 'Wednesday', '7:00-7:30', 'on campus');


✅ 2. FRONTEND JSON (ready for React)

[
  {
    "id": 1,
    "name": "Aung Nanda O",
    "pronouns": "he/him",
    "bio": "I also go by Nikki. Extrovert who enjoys helping others succeed. Skilled in Python, Java, JavaScript, React, HTML, CSS.",
    "mode": "online",
    "skills": ["Python", "Java", "JavaScript", "React", "HTML", "CSS"],
    "availability": [
      { "day": "Monday", "time": "9:30-10:00", "mode": "online" },
      { "day": "Wednesday", "time": "4:00-4:30", "mode": "online" },
      { "day": "Wednesday", "time": "4:30-5:00", "mode": "online" }
    ]
  },
  {
    "id": 2,
    "name": "Mei O",
    "pronouns": "she/they",
    "bio": "Aspiring AI & Linguistics researcher. Daily Arch Linux user. Passionate about Python, Linux, and machine learning concepts.",
    "mode": "online",
    "skills": ["Python", "Linux", "Debugging"],
    "availability": [
      { "day": "Tuesday", "time": "11:00-11:30", "mode": "online" },
      { "day": "Tuesday", "time": "11:30-12:00", "mode": "online" },
      { "day": "Thursday", "time": "2:30-3:00", "mode": "online" }
    ]
  },
  {
    "id": 3,
    "name": "Chris H",
    "pronouns": "he/him",
    "bio": "Problem solver and travel enthusiast. Experienced with Python, Java, SQL, JavaScript, CSS, and MIPS assembly.",
    "mode": "on campus",
    "skills": ["Python", "Java", "SQL", "JavaScript", "CSS", "MIPS Assembly"],
    "availability": [
      { "day": "Monday", "time": "10:00-10:30", "mode": "on campus" },
      { "day": "Monday", "time": "10:30-11:00", "mode": "on campus" },
      { "day": "Friday", "time": "11:00-11:30", "mode": "on campus" }
    ]
  },
  {
    "id": 4,
    "name": "Claire C",
    "bio": "Second-year CS major. Swimmer, pianist, and board game lover. Excited to tutor programming fundamentals.",
    "mode": "on campus",
    "skills": ["Python", "C++", "Debugging"],
    "availability": [
      { "day": "Wednesday", "time": "9:30-10:00", "mode": "on campus" },
      { "day": "Wednesday", "time": "10:00-10:30", "mode": "on campus" },
      { "day": "Wednesday", "time": "7:00-7:30", "mode": "on campus" }
    ]
  }
]
