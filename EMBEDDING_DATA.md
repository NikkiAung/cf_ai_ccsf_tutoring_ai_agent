# What Data is Used for Embeddings?

## Tutor Embeddings (Stored in Vectorize)

When generating embeddings for tutors, the following data is combined into a text string:

### Fields Included:

1. **Tutor Name** - e.g., "Chris H"
2. **Pronouns** (if available) - e.g., "he/him"
3. **Bio** - Full bio text
4. **Skills** - Comma-separated list - e.g., "Python, Java, SQL, JavaScript, CSS, MIPS Assembly"
5. **Mode** - "online" or "on campus"
6. **Availability** - All time slots formatted as "Day Time (Mode)"

### Example Text Sent to OpenAI:

```
Tutor: Chris H
Pronouns: he/him
Bio: Problem solver and travel enthusiast. Experienced with Python, Java, SQL, JavaScript, CSS, and MIPS assembly.
Skills: Python, Java, SQL, JavaScript, CSS, MIPS Assembly
Mode: on campus
Availability: Monday 10:00-10:30 (on campus), Monday 10:30-11:00 (on campus), Friday 11:00-11:30 (on campus)
```

This entire text is sent to OpenAI's `text-embedding-3-small` model to generate a 1536-dimensional vector.

## Query Embeddings (Generated on-the-fly)

When a user searches, their query is converted to:

### Fields Included:

1. **Skills needed** - e.g., "Python" or "Python, Java"
2. **Preferred day** (if provided) - e.g., "Monday"
3. **Preferred time** (if provided) - e.g., "10:00"
4. **Preferred mode** (if provided) - e.g., "online" or "on campus"

### Example Query Text Sent to OpenAI:

```
Student needs help with: Python
Preferred day: Monday
Preferred time: 10:00
Preferred mode: on campus
```

## Why This Data?

### Included:
- ✅ **Bio** - Captures teaching style, personality, expertise areas
- ✅ **Skills** - Direct matching for what students need
- ✅ **Availability** - Helps match time preferences
- ✅ **Mode** - Online vs on-campus preference
- ✅ **Name** - Context for the tutor

### Not Included:
- ❌ **Tutor ID** - Not semantically meaningful
- ❌ **Raw database fields** - We use human-readable text instead

## How It Works

1. **Tutor Data** → Combined into text → **Embedding** → Stored in Vectorize
2. **User Query** → Combined into text → **Embedding** → Search Vectorize
3. **Cosine Similarity** → Find most similar tutor embeddings
4. **LLM Reasoning** → Select best match from top candidates

## Example: Full Flow

### Tutor Embedding (Stored):
```
Tutor: Mei O
Pronouns: she/they
Bio: Aspiring AI & Linguistics researcher. Daily Arch Linux user. Passionate about Python, Linux, and machine learning concepts.
Skills: Python, Linux, Debugging
Mode: online
Availability: Monday 10:00-10:30 (online), Wednesday 2:00-2:30 (online), Friday 11:00-11:30 (online)
```

### User Query Embedding (Generated):
```
Student needs help with: Python
Preferred day: Monday
Preferred mode: online
```

### Result:
- Query embedding is compared with all tutor embeddings
- Mei O's embedding will have high similarity (Python + Monday + online)
- LLM selects Mei O as best match

## Model Used

- **Model**: `text-embedding-3-small`
- **Dimensions**: 1536
- **Cost**: ~$0.02 per 1M tokens
- **Quality**: Good balance of cost and performance

## Customization

You can modify what data is included by editing:

1. **Tutor Embeddings**: `lib/embeddings.ts` → `generateTutorEmbedding()`
2. **Query Embeddings**: `lib/embeddings.ts` → `generateQueryEmbedding()`

For example, you could add:
- More detailed availability information
- Tutor ratings or reviews
- Specializations or certifications
- Languages spoken

