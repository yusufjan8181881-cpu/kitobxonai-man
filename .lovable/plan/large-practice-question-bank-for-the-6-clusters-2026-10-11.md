# Large practice question bank for the 6 clusters

## Current state (checked)
- The database has 66 questions across 13 subjects. Each cluster gets its questions from the subjects linked to it, so one question can count for several clusters (for example, mathematics counts for Clusters I, II and VI).
- Every question is stored once. A built-in duplicate check (the same text, ignoring spaces and letter case) rejects repeats.
- The preview is broken right now: there are leftover code errors, and the menu links to pages that don't exist yet (AI, sign-in, reading page, saved materials, admin). This gets fixed first.

## Step 1 — Get the site working again
- Fix the remaining code errors in the quiz, cluster, library and header code.
- Add simple working versions of the missing pages so no button leads to a 404:
  - Sign-in (email and Google)
  - Reading page with a bookmark button
  - Saved materials
  - AI page: a working Tajik chat if credits allow; otherwise a clear "coming soon" note, never fake answers
  - Admin page: question list with search and delete
- Check the quiz flow: pick an answer, next or previous question, timer, score, percentage, and explanations at the end.

## Step 2 — Fill the question bank in batches
Target number of questions per subject (all in Tajik, 4 options, one correct answer, an explanation, a topic, a grade, and roughly equal easy, medium and hard):

| Subject | Target |
|---|---|
| Mathematics (with calculations) | 120 |
| Physics (with calculations) | 80 |
| Chemistry (with calculations) | 80 |
| Tajik language | 80 |
| Tajik literature | 60 |
| Russian language | 40 |
| English language | 60 |
| History of the Tajik people | 100 |
| World history | 60 |
| Geography | 80 |
| Biology | 100 |
| Computer science | 60 |
| Programming | 60 |

Resulting count per cluster (counted through the subject links):

```text
I   Math + Physics + Tajik language                 = 280
II  Math + Geography + Tajik language               = 280
III Tajik language + Literature + English + Russian = 240
IV  Tajik history + World history + Tajik language  = 240
V   Biology + Chemistry + Tajik language            = 260
VI  Math + Computer science + Programming + English = 300
Total cluster assignments: about 1,600 (about 980 unique questions)
```

- Questions are written in batches of about 40–60 per subject. Every batch is checked before saving:
  - exactly 4 options
  - the correct-answer number is in range
  - each calculation's answer is recomputed
  - no repeats
- Every new question is labelled "practice", never "official NTC".
- After each batch, the real count is read back from the database. Only those verified numbers are reported.
- If credits run out partway, I'll report the exact per-subject and per-cluster counts saved, and the next batch can continue from there.

## Step 3 — Verify
- Run a database count per cluster to confirm each has at least 200 questions.
- Open each of the 6 clusters in the browser, run a short quiz, and confirm the score and explanations.
- Add a small automatic test for the score calculation, for example 3 of 4 correct = 75%.

## Technical details
- Questions are added as data in the existing questions table (subject, topic, grade, difficulty, options, correct answer number, explanation; source set to "practice", status "approved"). The table structure doesn't change, and existing user data is left alone.
- If a repeated question is rejected, it is skipped and the rest of the batch still saves.
- Cluster counts are computed from the subject links, so shared subjects count toward every cluster they belong to.
- The quiz already pulls questions by the cluster's subjects; this stays as is.
