import { parseApplicationData } from '../lib/applicationParser'

const mockApplication = `
Carolina State University
Undergraduate Application (Mock Example)

1. Applicant Information
Full Legal Name: Jordan A. Patel
Preferred Name: Jordan Patel
Date of Birth: 04/15/2008
Home Address: 2810 Maple Ridge Drive, Riverview, NC 28102, United States
Phone: (704) 555-3927 Email: jordan.patel24@example.com
Citizenship: U.S. Citizen

2. Education
Current High School: Riverview High School (CEEB: 342987)
School Address: 1200 Riverview Parkway, Riverview, NC 28102
School Counselor: Ms. Lauren Michaels (lauren.michaels@riverviewhs.org)
Dates of Attendance: August 2021 – June 2025 (expected)
Class Size: 420 Class Rank: 23/420 (Top ~5%) GPA: 3.89 unweighted, 4.46 weighted (4.0 scale)
Most rigorous courses: AP CSA, AP Calc AB, AP Lang, AP U.S. History, Honors Physics, Honors Spanish IV.
Current Year Courses (12th Grade): AP Calc BC, AP Statistics, AP Physics 1, AP CSP, AP English Literature,
Honors Economics & Personal Finance, Honors Spanish IV.

3. Testing
SAT (Aug 2024): 1470 (ERW 710, Math 760)
ACT: Composite 33 (English 32, Math 34, Reading 33, Science 33)
AP Exams: CSA – 5, Calc AB – 5, U.S. History – 4, English Lang – 4.

5. Activities (Summary)
• Founder & President, Riverview Coding for Change – built websites/apps for nonprofits; led 12 members.
• Team Captain, Riverview Robotics Team 5812 – led programming & strategy; state finalists twice.
• Part-Time Barista, Maple Street Coffee – 10 hrs/week; trained new employees; balanced work & school.
• Volunteer Tutor, Riverview Youth Learning Center – helped middle schoolers with algebra & coding (220 hours).
• Junior Class Treasurer, Student Council – managed $4,000 budget; planned prom & spirit week.
• Varsity Cross Country – 4 years; improved 5K PR from 24:10 to 20:58; team 3rd in conference.
• Violinist (Section Leader), School Orchestra – led second violins; community performances.
• Participant, Carolina Tech Summer AI Institute – built basic ML model predicting book ratings.
• Staff Writer, Riverview Gazette – wrote features on clubs & local businesses.
• Independent Project: Local Library App – prototype tracking events and teen programs.

6. Honors & Awards
• NC Governor’s School Nominee – STEM (School level, Grade 11).
• AP Scholar with Distinction (College Board, Grade 11).
• Regional Robotics Finalist (Team, Grades 10–11).
• Riverview High Computer Science Award (Grade 11).
• Honor Roll – All semesters, Grades 9–11.

Activities (Summary) • Founder & President, Riverview Coding for Change – built websites/apps for nonprofits; led 12 members
• Team Captain, Riverview Robotics Team 5812 – led programming & strategy; state finalists twice
• Volunteer Tutor, Riverview Youth Learning Center – helped middle schoolers with algebra & coding
• Independent Project: Local Library App – prototype tracking events and teen programs
• Honors & Awards • NC Governor’s School Nominee – STEM (School level, Grade 11)
• Regional Robotics Finalist (Team, Grades 10–11)
• Riverview High Computer Science Award (Grade 11)
• It began when I brought my Chromebook there during lunch, frustrated with a stubborn error in my first real Java project
• I realized I loved debugging systems, whether they were programs, school projects, or team routines
• When our nonprofit web project stalled, the problem wasn’t the code; it was the lack of a plan

9. Additional Information
During the second half of 10th grade, my father’s consulting business lost its largest client, and our family income
dropped significantly. I picked up extra shifts at my part-time job and sometimes studied during late-night breaks.
My grades dipped slightly that semester (one B+ in Honors Chemistry), but I learned how to balance work, school, and family
responsibilities. Since then, my grades have returned to their previous level, and the experience has made me more organized and resilient.
`

const result = parseApplicationData(mockApplication)

console.log('--- Structured Field Updates ---')
console.table(
  Object.entries(result.updates).map(([field, value]) => ({
    field,
    value
  }))
)

console.log('\n--- Misc Notes ---')
result.misc.forEach((entry, idx) => console.log(`${idx + 1}. ${entry}`))

console.log('\n--- Metrics ---')
console.table(
  result.metrics.map(metric => ({
    field: metric.field ?? 'misc',
    label: metric.label,
    raw: metric.rawValue,
    mapped: metric.mappedValue ?? '—',
    misc: metric.miscEntry ?? '—'
  }))
)

console.log('\nDone. Remove this script once finished debugging.')

