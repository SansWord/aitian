---
# Copy this file to YYYY-MM-DD.md (TBA week) or YYYY-MM-DD-short-slug.md (booked),
# where the date is the meetup's PT calendar date.
# NEVER rename a file once it has deployed — the filename is the citable URL.
date: 2026-01-01
# startTime: "18:00"             # optional — defaults come from data/community.md
# endTime: "19:30"               # optional
# timezone: America/Los_Angeles  # optional; IANA name
segments: []
# A booked week looks like:
# segments:
#   - type: talk                 # talk | chat
#     title: "My talk title"     # or { en: "...", zh: "..." }
#     speaker: YourName          # display name; anything merged here is public — links beat raw emails
#     speakerBio: ""             # optional; 1-2 sentences, markdown links OK (http(s) only)
#     description: |             # optional; short, multi-line markdown summary of this segment
#       What this talk/chat is about.
#     links:                     # optional; the speaker's public links — public once merged
#       - label: LinkedIn        # or { en: "...", zh: "..." }
#         url: "https://www.linkedin.com/in/you"
#     materials:                 # optional; the segment's slides/demo/repo links
#       - label: Slides          # or { en: "...", zh: "..." }
#         url: "https://example.com/slides.pdf"
attendees: null                  # back-fill after the event (integer)
# rsvpUrl: "https://lu.ma/your-event"  # optional; once set, an RSVP button is
#   auto-shown on the landing hero (while this is the next meetup with a link)
#   and on this meetup's own detail page — no "rsvp" cta needed or allowed.
# ctas:                          # optional; REPLACES the community CTAs on this page while upcoming
#   - id: survey                 # unique within this file; "rsvp" is reserved (use rsvpUrl above)
#     label: Survey              # or { en: "...", zh: "..." }
#     href: "https://forms.gle/your-survey"   # "" renders a disabled placeholder button
---

Optional meetup intro (markdown). Use "## en" / "## zh" headings for bilingual content.
